using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using WinPortal.Ui.Controls;
using WinPortal.Ui.Common;
using WinPortal.Ui.Shell;

namespace WinPortal.Ui.Tools;

/// <summary>Configuração de um analisador de arquivos corrompidos.</summary>
public sealed class AnalyzerOptions
{
    /// <summary>Identificador da ferramenta (slug), usado para lembrar a última pasta.</summary>
    public required string ToolId { get; init; }
    public required string Title { get; init; }
    public required string Subtitle { get; init; }
    public required IEnumerable<string> Extensions { get; init; }
    public required string FolderDialogTitle { get; init; }
    public required string EmptyMessage { get; init; }
    public required Func<string, bool> IsCorruptFile { get; init; }
    public Func<string?>? ValidationError { get; init; }
}

/// <summary>
/// Interface e fluxo comuns aos analisadores (core/analyzer_base.py): localiza os
/// arquivos, analisa, lista os corrompidos, pede confirmação e apaga.
/// </summary>
public partial class CorruptedFileAnalyzerView : ToolView
{
    private const int PreviewLimit = 2_000;

    private enum Phase { Idle, Discover, Analysis, Delete }

    private readonly AnalyzerOptions _options;
    private readonly HashSet<string> _extensions;
    private readonly DispatcherTimer _poll;
    private readonly object _gate = new();

    private (Phase Phase, int Current, int Total, int Count, int Failures) _snapshot = (Phase.Idle, 0, 0, 0, 0);
    private (Phase, int, int, int, int)? _lastSnapshot;
    private int _analysisTotal;
    private int _analysisCorrupted;

    // Resultado da última execução, para exportar: arquivo -> situação.
    private List<string> _corrupted = [];
    private Dictionary<string, string> _outcome = new(StringComparer.OrdinalIgnoreCase);

    public CorruptedFileAnalyzerView(AnalyzerOptions options)
    {
        InitializeComponent();
        _options = options;
        _extensions = new HashSet<string>(options.Extensions, StringComparer.OrdinalIgnoreCase);
        Page.Title = options.Title;
        Page.Subtitle = options.Subtitle;
        Folder.ToolId = options.ToolId;
        Folder.DialogTitle = options.FolderDialogTitle;
        _poll = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(100) };
        _poll.Tick += (_, _) => RefreshProgress();
        ClearResults();
    }

    private void SetSnapshot(Phase phase, int current, int total, int count, int failures)
    {
        lock (_gate) _snapshot = (phase, current, total, count, failures);
    }

    private void OnPathChanged(object? sender, EventArgs e) => Actions.CanStart = Folder.Text.Length > 0;

    private void OnStart(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;

        var folder = Folder.Text;
        if (folder.Length == 0 || !Directory.Exists(folder))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }

        if (_options.ValidationError?.Invoke() is { } error)
        {
            MessageDialog.Error(Owner, "Erro", error);
            return;
        }

        ToolSettings.RememberFolder(_options.ToolId, folder);
        ClearResults();
        var token = BeginWork();
        SetSnapshot(Phase.Discover, 0, 0, 0, 0);
        _lastSnapshot = null;
        Progress.Working("Localizando arquivos: 0", 0);
        _poll.Start();
        StartWorker(() => AnalysisWorker(folder, token));
    }

    private void OnStop(object sender, RoutedEventArgs e)
    {
        if (!IsBusy) return;
        RequestCancel();
        Progress.Working("Cancelando... aguarde o arquivo atual.");
    }

    /// <summary>Thread STA dedicada: os decodificadores de imagem do Windows exigem COM.</summary>
    private static void StartWorker(Action work)
    {
        var thread = new Thread(() => work()) { IsBackground = true, Name = "WinPortal.Analyzer" };
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
    }

    private void Post(Action action) => Dispatcher.BeginInvoke(action);

    private void AnalysisWorker(string folder, CancellationToken token)
    {
        var corrupted = new List<string>();
        int checkedCount = 0, total = 0;
        try
        {
            var clock = Stopwatch.StartNew();
            var next = 0L;
            foreach (var _ in FileWalker.SupportedFiles(folder, _extensions))
            {
                if (token.IsCancellationRequested)
                {
                    Post(() => Cancelled(checkedCount, total, corrupted));
                    return;
                }
                total++;
                if (clock.ElapsedMilliseconds >= next)
                {
                    SetSnapshot(Phase.Discover, total, 0, 0, 0);
                    next = clock.ElapsedMilliseconds + 100;
                }
            }

            if (token.IsCancellationRequested)
            {
                Post(() => Cancelled(checkedCount, total, corrupted));
                return;
            }

            if (total == 0)
            {
                Post(EmptyFolder);
                return;
            }

            SetSnapshot(Phase.Analysis, 0, total, 0, 0);
            next = 0;
            foreach (var path in FileWalker.SupportedFiles(folder, _extensions))
            {
                if (token.IsCancellationRequested)
                {
                    var snapshotList = corrupted.ToList();
                    var (c, t) = (checkedCount, total);
                    Post(() => Cancelled(c, t, snapshotList));
                    return;
                }

                bool isCorrupt;
                try { isCorrupt = _options.IsCorruptFile(path); }
                catch { isCorrupt = true; }

                checkedCount++;
                if (isCorrupt) corrupted.Add(path);

                if (clock.ElapsedMilliseconds >= next)
                {
                    SetSnapshot(Phase.Analysis, checkedCount, total, corrupted.Count, 0);
                    next = clock.ElapsedMilliseconds + 100;
                }
            }

            total = Math.Max(total, checkedCount);
            SetSnapshot(Phase.Analysis, checkedCount, total, corrupted.Count, 0);
            var (done, all) = (checkedCount, total);
            Post(() => AnalysisDone(done, all, corrupted));
        }
        catch (Exception ex)
        {
            Post(() => Failed(ex.Message));
        }
    }

    private void DeleteWorker(IReadOnlyList<string> files, CancellationToken token)
    {
        int processed = 0, deleted = 0, failures = 0;
        var outcome = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var clock = Stopwatch.StartNew();
            var next = 0L;
            foreach (var path in files)
            {
                if (token.IsCancellationRequested) break;
                try
                {
                    File.Delete(path);
                    if (File.Exists(path))
                    {
                        failures++;
                        outcome[path] = "Falha ao apagar";
                    }
                    else
                    {
                        deleted++;
                        outcome[path] = "Apagado";
                    }
                }
                catch (Exception ex)
                {
                    failures++;
                    outcome[path] = $"Falha ao apagar: {ex.Message}";
                }
                processed++;
                if (clock.ElapsedMilliseconds >= next)
                {
                    SetSnapshot(Phase.Delete, processed, files.Count, deleted, failures);
                    next = clock.ElapsedMilliseconds + 100;
                }
            }
            SetSnapshot(Phase.Delete, processed, files.Count, deleted, failures);
            var cancelled = token.IsCancellationRequested;
            Post(() => DeleteDone(processed, files.Count, deleted, failures, cancelled, outcome));
        }
        catch (Exception ex)
        {
            Post(() => Failed(ex.Message));
        }
    }

    private void RefreshProgress()
    {
        (Phase Phase, int Current, int Total, int Count, int Failures) snapshot;
        lock (_gate) snapshot = _snapshot;
        if (_lastSnapshot == snapshot) return;
        _lastSnapshot = snapshot;
        if (CancelRequested) return;

        switch (snapshot.Phase)
        {
            case Phase.Discover:
                Progress.Working($"Localizando arquivos: {snapshot.Current:N0}");
                break;
            case Phase.Analysis:
                var denominator = Math.Max(snapshot.Total, snapshot.Current);
                Progress.Working($"Analisando {snapshot.Current:N0}/{denominator:N0} · {snapshot.Count:N0} corrompido(s)",
                    denominator > 0 ? (double)snapshot.Current / denominator : 0);
                break;
            case Phase.Delete:
                Progress.Working($"Apagando {snapshot.Current:N0}/{snapshot.Total:N0} · {snapshot.Failures:N0} falha(s)",
                    snapshot.Total > 0 ? (double)snapshot.Current / snapshot.Total : 0);
                break;
        }
    }

    private void Stop()
    {
        _poll.Stop();
        lock (_gate) _lastSnapshot = _snapshot;
        EndWork();
    }

    private void EmptyFolder()
    {
        Stop();
        Progress.Done("Concluído · nenhum arquivo para analisar.");
        MessageDialog.Info(Owner, "Análise concluída", _options.EmptyMessage);
    }

    private void Cancelled(int checkedCount, int total, IReadOnlyList<string> corrupted)
    {
        Stop();
        ShowResults(corrupted);
        Progress.Cancelled($"Cancelado · {checkedCount:N0}/{total:N0} analisado(s) · {corrupted.Count:N0} corrompido(s)");
    }

    private void AnalysisDone(int checkedCount, int total, List<string> corrupted)
    {
        _analysisTotal = total;
        _analysisCorrupted = corrupted.Count;
        ShowResults(corrupted);

        if (corrupted.Count == 0)
        {
            Stop();
            Progress.Done($"Concluído · {total:N0} arquivo(s) analisado(s) · nenhum corrompido");
            MessageDialog.Success(Owner, "Análise concluída", $"{total:N0} arquivo(s) analisado(s). Nenhum arquivo corrompido foi encontrado.");
            return;
        }

        Progress.Warn($"{checkedCount:N0} arquivo(s) analisado(s) · {corrupted.Count:N0} corrompido(s). Confira a lista.");
        var confirmed = MessageDialog.Confirm(Owner, "Confirmar exclusão",
            $"Foram encontrados {corrupted.Count:N0} arquivo(s) corrompido(s), listados na tela.\n\nDeseja apagá-los permanentemente?",
            yes: "Apagar", no: "Cancelar", destructive: true);
        if (!confirmed)
        {
            Stop();
            Progress.Warn($"Concluído · {total:N0} analisado(s) · {corrupted.Count:N0} corrompido(s) mantido(s)");
            return;
        }

        var token = BeginWork();
        SetSnapshot(Phase.Delete, 0, corrupted.Count, 0, 0);
        _lastSnapshot = null;
        Progress.Working($"Apagando 0/{corrupted.Count:N0}", 0);
        StartWorker(() => DeleteWorker(corrupted, token));
    }

    private void DeleteDone(int processed, int total, int deleted, int failures, bool cancelled,
        Dictionary<string, string> outcome)
    {
        foreach (var (path, status) in outcome) _outcome[path] = status;
        Stop();
        var summary = $"{_analysisTotal:N0} analisado(s) · {_analysisCorrupted:N0} corrompido(s) · " +
                      $"{deleted:N0} apagado(s) · {failures:N0} falha(s)";
        if (cancelled)
        {
            Progress.Cancelled($"Cancelado · {summary}");
            return;
        }
        if (failures > 0)
        {
            Progress.Warn($"Concluído com falhas · {summary}");
            MessageDialog.Warning(Owner, "Concluído com falhas",
                $"{deleted:N0} arquivo(s) apagado(s).\n{failures:N0} não puderam ser apagados (veja Exportar relatório).");
            return;
        }
        Progress.Done($"Concluído · {summary}");
        MessageDialog.Success(Owner, "Concluído", $"{deleted:N0} arquivo(s) corrompido(s) apagado(s).");
    }

    private void Failed(string message)
    {
        Stop();
        Progress.Failed("Falha durante o processamento.");
        MessageDialog.Error(Owner, "Erro", $"Não foi possível concluir a operação:\n{message}");
    }

    private void ShowResults(IReadOnlyList<string> corrupted)
    {
        _corrupted = corrupted.ToList();
        _outcome = _corrupted.ToDictionary(p => p, _ => "Corrompido", StringComparer.OrdinalIgnoreCase);
        Results.Clear();
        ResultsCard.Summary = corrupted.Count > 0 ? $"{corrupted.Count:N0} arquivo(s)" : "";
        ResultsCard.ShowPlaceholder(corrupted.Count == 0);
        foreach (var path in corrupted.Take(PreviewLimit)) Results.AppendLine(path);
        if (corrupted.Count > PreviewLimit)
        {
            Results.AppendLine("");
            Results.AppendLine($"... e mais {corrupted.Count - PreviewLimit:N0} arquivos não exibidos (use Exportar relatório para a lista completa).");
        }
    }

    private void ClearResults()
    {
        _corrupted = [];
        _outcome.Clear();
        Results.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(true);
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        ClearResults();
        Progress.Ready("Selecione uma pasta e clique em Analisar.");
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        if (_corrupted.Count == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        ReportExport.SaveCsv(this, _options.ToolId, $"{_options.ToolId}_relatorio", ["arquivo", "situacao"],
            _corrupted.Select(p => (IReadOnlyList<string>)[p, _outcome.GetValueOrDefault(p, "Corrompido")]));
    }

    protected override void OnBusyChanged(bool busy)
    {
        Folder.IsEnabled = !busy;
        Actions.IsBusy = busy;
        ResultsCard.SetBusy(busy);
    }
}

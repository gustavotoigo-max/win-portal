using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using WinPortal.Ui.Common;
using WinPortal.Ui.Shell;

namespace WinPortal.Ui.Tools;

/// <summary>Configuração de um analisador de arquivos corrompidos.</summary>
public sealed class AnalyzerOptions
{
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
public partial class CorruptedFileAnalyzerView : UserControl
{
    private const int PreviewLimit = 2_000;

    private enum Phase { Idle, Discover, Analysis, Delete }

    private readonly AnalyzerOptions _options;
    private readonly HashSet<string> _extensions;
    private readonly DispatcherTimer _poll;
    private readonly object _gate = new();

    private (Phase Phase, int Current, int Total, int Count, int Failures) _snapshot = (Phase.Idle, 0, 0, 0, 0);
    private (Phase, int, int, int, int)? _lastSnapshot;
    private CancellationTokenSource? _cts;
    private bool _running;
    private int _analysisTotal;
    private int _analysisCorrupted;

    public CorruptedFileAnalyzerView(AnalyzerOptions options)
    {
        InitializeComponent();
        _options = options;
        _extensions = new HashSet<string>(options.Extensions, StringComparer.OrdinalIgnoreCase);
        Page.Title = options.Title;
        Page.Subtitle = options.Subtitle;
        _poll = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(100) };
        _poll.Tick += (_, _) => RefreshProgress();
        Unloaded += (_, _) => _cts?.Cancel();
    }

    private Window? Owner => Window.GetWindow(this);

    private void SetSnapshot(Phase phase, int current, int total, int count, int failures)
    {
        lock (_gate) _snapshot = (phase, current, total, count, failures);
    }

    private void OnPathChanged(object sender, TextChangedEventArgs e)
    {
        if (!_running) StartButton.IsEnabled = PathBox.Text.Trim().Length > 0;
    }

    private void OnSelect(object sender, RoutedEventArgs e)
    {
        if (_running) return;
        var folder = Pickers.Folder(Owner, _options.FolderDialogTitle, PathBox.Text);
        if (folder is null) return;
        PathBox.Text = folder;
        StartButton.IsEnabled = true;
        Progress.Value = 0;
        StatusText.Text = $"Pasta selecionada: {folder}. Clique em Iniciar.";
        ClearResults();
    }

    private void OnStart(object sender, RoutedEventArgs e)
    {
        if (_running) return;

        var folder = PathBox.Text.Trim();
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

        ClearResults();
        _cts = new CancellationTokenSource();
        SetSnapshot(Phase.Discover, 0, 0, 0, 0);
        _lastSnapshot = null;
        Progress.Value = 0;
        StatusText.Text = "Localizando arquivos: 0";
        SetRunning(true);

        var token = _cts.Token;
        StartWorker(() => AnalysisWorker(folder, token));
    }

    private void OnStop(object sender, RoutedEventArgs e)
    {
        if (!_running) return;
        _cts?.Cancel();
        StopButton.IsEnabled = false;
        StatusText.Text = "Parando... aguarde o arquivo atual.";
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
                    if (File.Exists(path)) failures++;
                    else deleted++;
                }
                catch
                {
                    failures++;
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
            Post(() => DeleteDone(processed, files.Count, deleted, failures, cancelled));
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

        switch (snapshot.Phase)
        {
            case Phase.Discover:
                StatusText.Text = $"Localizando arquivos: {snapshot.Current:N0}";
                break;
            case Phase.Analysis:
                var denominator = Math.Max(snapshot.Total, snapshot.Current);
                Progress.Value = denominator > 0 ? (double)snapshot.Current / denominator : 0;
                StatusText.Text = $"Análise: {snapshot.Current:N0}/{denominator:N0} · {snapshot.Count:N0} corrompido(s)";
                break;
            case Phase.Delete:
                Progress.Value = snapshot.Total > 0 ? (double)snapshot.Current / snapshot.Total : 0;
                StatusText.Text = $"Análise: {_analysisTotal:N0}/{_analysisTotal:N0} · {_analysisCorrupted:N0} corrompido(s) | " +
                                  $"Exclusão: {snapshot.Current:N0}/{snapshot.Total:N0} ({snapshot.Failures:N0} falha(s))";
                break;
        }
    }

    private void EmptyFolder()
    {
        Progress.Value = 0;
        StatusText.Text = "Análise: 0/0 · 0 corrompido(s)";
        SetRunning(false);
        MessageDialog.Info(Owner, "Aviso", _options.EmptyMessage);
    }

    private void Cancelled(int checkedCount, int total, IReadOnlyList<string> corrupted)
    {
        Progress.Value = total > 0 ? (double)checkedCount / total : 0;
        StatusText.Text = $"Análise: {checkedCount:N0}/{total:N0} · {corrupted.Count:N0} corrompido(s) (cancelada)";
        ShowResults(corrupted);
        SetRunning(false);
    }

    private void AnalysisDone(int checkedCount, int total, List<string> corrupted)
    {
        _analysisTotal = total;
        _analysisCorrupted = corrupted.Count;
        Progress.Value = 1;
        StatusText.Text = $"Análise: {checkedCount:N0}/{total:N0} · {corrupted.Count:N0} corrompido(s)";
        ShowResults(corrupted);

        if (corrupted.Count == 0)
        {
            SetRunning(false);
            MessageDialog.Success(Owner, "Análise concluída", "Nenhum arquivo corrompido foi encontrado.");
            return;
        }

        var confirmed = MessageDialog.Confirm(Owner, "Confirmar exclusão",
            $"Foram encontrados {corrupted.Count:N0} arquivos corrompidos.\n\nDeseja apagá-los permanentemente?",
            yes: "Apagar", no: "Manter", destructive: true);
        if (!confirmed)
        {
            SetRunning(false);
            return;
        }

        _cts = new CancellationTokenSource();
        var token = _cts.Token;
        StopButton.IsEnabled = true;
        Progress.Value = 0;
        SetSnapshot(Phase.Delete, 0, corrupted.Count, 0, 0);
        _lastSnapshot = null;
        StartWorker(() => DeleteWorker(corrupted, token));
    }

    private void DeleteDone(int processed, int total, int deleted, int failures, bool cancelled)
    {
        Progress.Value = total > 0 ? (double)processed / total : 1;
        var suffix = cancelled ? " (cancelada)" : "";
        StatusText.Text = $"Análise: {_analysisTotal:N0}/{_analysisTotal:N0} · {_analysisCorrupted:N0} corrompido(s) | " +
                          $"Exclusão: {deleted:N0} apagado(s), {failures:N0} falha(s){suffix}";
        SetRunning(false);
    }

    private void Failed(string message)
    {
        SetRunning(false);
        StatusText.Text = "Falha durante o processamento.";
        MessageDialog.Error(Owner, "Erro", $"Não foi possível concluir a operação:\n{message}");
    }

    private void ShowResults(IReadOnlyList<string> corrupted)
    {
        if (corrupted.Count == 0)
        {
            ClearResults();
            return;
        }

        Results.Clear();
        foreach (var path in corrupted.Take(PreviewLimit)) Results.AppendLine(path);
        if (corrupted.Count > PreviewLimit)
        {
            Results.AppendLine("");
            Results.AppendLine($"... e mais {corrupted.Count - PreviewLimit:N0} arquivos não exibidos para manter o desempenho.");
        }
        Results.Visibility = Visibility.Visible;
        EmptyResults.Visibility = Visibility.Collapsed;
    }

    private void ClearResults()
    {
        Results.Clear();
        Results.Visibility = Visibility.Collapsed;
        EmptyResults.Visibility = Visibility.Visible;
    }

    private void SetRunning(bool running)
    {
        _running = running;
        PathBox.IsEnabled = !running;
        SelectButton.IsEnabled = !running;
        StartButton.IsEnabled = !running && PathBox.Text.Trim().Length > 0;
        StopButton.IsEnabled = running;
        if (running) _poll.Start();
        else
        {
            _poll.Stop();
            lock (_gate) _lastSnapshot = _snapshot;
        }
    }
}

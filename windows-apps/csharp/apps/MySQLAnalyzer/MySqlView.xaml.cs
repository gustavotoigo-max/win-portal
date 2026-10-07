using System.Collections.ObjectModel;
using System.Globalization;
using System.Windows;

namespace WinPortal.Apps.MySqlAnalyzer;

public sealed record FileResult(string Path, bool Ok, string Detail, double Entropy)
{
    public string Status => Ok ? "Íntegro" : "Corrompido";
    public string EntropyText => Entropy >= 0 ? Entropy.ToString("0.00") : "—";
}

public partial class MySqlView : ToolView
{
    private const string ToolId = "mysql_analyzer";
    private readonly ObservableCollection<FileResult> _results = [];

    public MySqlView()
    {
        InitializeComponent();
        ResultsGrid.ItemsSource = _results;
        ResultsCard.ShowPlaceholder(true);
    }

    private void OnPathChanged(object? sender, EventArgs e) => Actions.CanStart = Folder.Text.Length > 0;

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        RequestCancel();
        Progress.Working("Cancelando... aguarde o arquivo atual.");
    }

    private async void OnAnalyze(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        var folder = Folder.Text;
        if (folder.Length == 0 || !Directory.Exists(folder))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }

        ToolSettings.RememberFolder(ToolId, folder);
        _results.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(false);
        var token = BeginWork();
        Progress.Working("Localizando arquivos...");

        var entropies = new List<double>();
        var good = 0;
        var total = 0;
        Exception? failure = null;

        await Task.Run(() =>
        {
            try
            {
                var paths = FileWalker.AllFiles(folder).ToList();
                total = paths.Count;
                var batch = new List<FileResult>();
                var lastFlush = Environment.TickCount64;

                for (var i = 0; i < paths.Count; i++)
                {
                    if (token.IsCancellationRequested) break;
                    var (ok, detail) = MySqlChecks.ClassifyAndCheck(paths[i]);
                    var entropy = MySqlChecks.ShannonEntropy(paths[i]);
                    if (entropy >= 0) entropies.Add(entropy);
                    if (ok) good++;
                    batch.Add(new FileResult(paths[i], ok, detail, entropy));

                    if (Environment.TickCount64 - lastFlush > 100 || i == paths.Count - 1 || token.IsCancellationRequested)
                    {
                        lastFlush = Environment.TickCount64;
                        var items = batch.ToList();
                        batch.Clear();
                        var (done, progress) = (i + 1, (i + 1.0) / paths.Count);
                        Dispatcher.BeginInvoke(() =>
                        {
                            foreach (var item in items) _results.Add(item);
                            ResultsCard.Summary = $"{_results.Count:N0} arquivo(s)";
                            if (!CancelRequested) Progress.Working($"Analisando {done:N0}/{paths.Count:N0}", progress);
                        });
                    }
                }
                if (batch.Count > 0)
                {
                    var rest = batch.ToList();
                    Dispatcher.BeginInvoke(() => { foreach (var item in rest) _results.Add(item); });
                }
            }
            catch (Exception ex)
            {
                failure = ex;
            }
        });
        await Dispatcher.InvokeAsync(() => { }, System.Windows.Threading.DispatcherPriority.Background);

        var cancelled = CancelRequested;
        EndWork();
        if (failure is not null)
        {
            Progress.Failed("Falha durante a análise.");
            MessageDialog.Error(Owner, "Erro", failure.Message);
            return;
        }
        if (total == 0)
        {
            ResultsCard.ShowPlaceholder(true);
            Progress.Done("Concluído · nenhum arquivo encontrado.");
            MessageDialog.Info(Owner, "Análise concluída", "Nenhum arquivo encontrado na pasta.");
            return;
        }

        var analysed = _results.Count;
        var bad = analysed - good;
        var average = entropies.Count > 0 ? entropies.Average() : 0.0;
        var summary = $"Íntegros: {good:N0}/{analysed:N0} · Corrompidos: {bad:N0} · Entropia média: {average:0.00} bits/byte";
        ResultsCard.Summary = $"{analysed:N0} arquivo(s)";
        if (cancelled)
        {
            Progress.Cancelled($"Cancelado · {summary}");
            return;
        }
        if (bad > 0)
        {
            Progress.Warn($"Concluído · {summary}");
            MessageDialog.Warning(Owner, "Análise concluída", $"{analysed:N0} arquivo(s) analisado(s).\n{bad:N0} com indício de corrupção (veja a lista).");
            return;
        }
        Progress.Done($"Concluído · {summary}");
        MessageDialog.Success(Owner, "Análise concluída", $"{analysed:N0} arquivo(s) analisado(s). Nenhum indício de corrupção.");
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        _results.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(true);
        Progress.Ready("Selecione a pasta de dados do MySQL e clique em Analisar.");
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        if (_results.Count == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        ReportExport.SaveCsv(this, ToolId, "relatorio_mysql", ["arquivo", "status", "detalhes", "entropia"],
            _results.Select(r => (IReadOnlyList<string>)[r.Path, r.Status, r.Detail,
                r.Entropy >= 0 ? r.Entropy.ToString("0.00", CultureInfo.CurrentCulture) : ""]));
    }

    protected override void OnBusyChanged(bool busy)
    {
        Folder.IsEnabled = !busy;
        Actions.IsBusy = busy;
        ResultsCard.SetBusy(busy);
    }
}

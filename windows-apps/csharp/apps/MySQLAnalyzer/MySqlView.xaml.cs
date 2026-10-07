using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Apps.MySqlAnalyzer;

public sealed record FileResult(string Path, bool Ok, string Detail, double Entropy)
{
    public string Status => Ok ? "Íntegro" : "Corrompido";
    public string EntropyText => Entropy >= 0 ? Entropy.ToString("0.00") : "—";
}

public partial class MySqlView : UserControl
{
    private readonly ObservableCollection<FileResult> _results = [];

    public MySqlView()
    {
        InitializeComponent();
        ResultsGrid.ItemsSource = _results;
    }

    private Window? Owner => Window.GetWindow(this);

    private void OnSelect(object sender, RoutedEventArgs e)
    {
        var path = Pickers.Folder(Owner, "Selecione a pasta do banco (datadir)", FolderBox.Text);
        if (path is not null) FolderBox.Text = path;
    }

    private async void OnAnalyze(object sender, RoutedEventArgs e)
    {
        var folder = FolderBox.Text.Trim();
        if (folder.Length == 0 || !Directory.Exists(folder))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }

        _results.Clear();
        Progress.Value = 0;
        StatusText.Text = "Analisando...";
        SummaryText.Text = "Analisando...";
        AnalyzeButton.IsEnabled = false;
        SelectButton.IsEnabled = false;

        var entropies = new List<double>();
        var good = 0;
        var total = 0;

        await Task.Run(() =>
        {
            var paths = FileWalker.AllFiles(folder).ToList();
            total = paths.Count;
            var batch = new List<FileResult>();
            var lastFlush = Environment.TickCount64;

            for (var i = 0; i < paths.Count; i++)
            {
                var (ok, detail) = MySqlChecks.ClassifyAndCheck(paths[i]);
                var entropy = MySqlChecks.ShannonEntropy(paths[i]);
                if (entropy >= 0) entropies.Add(entropy);
                if (ok) good++;
                batch.Add(new FileResult(paths[i], ok, detail, entropy));

                if (Environment.TickCount64 - lastFlush > 100 || i == paths.Count - 1)
                {
                    lastFlush = Environment.TickCount64;
                    var items = batch.ToList();
                    batch.Clear();
                    var progress = (i + 1.0) / paths.Count;
                    Dispatcher.BeginInvoke(() =>
                    {
                        foreach (var item in items) _results.Add(item);
                        Progress.Value = progress;
                    });
                }
            }
        });

        AnalyzeButton.IsEnabled = true;
        SelectButton.IsEnabled = true;
        if (total == 0)
        {
            StatusText.Text = "Nenhum arquivo encontrado.";
            SummaryText.Text = "Nenhum arquivo";
            return;
        }

        var average = entropies.Count > 0 ? entropies.Average() : 0.0;
        Progress.Value = 1;
        StatusText.Text = $"Entropia média: {average:0.00} bits/byte | Íntegros: {good:N0}/{total:N0}";
        SummaryText.Text = $"Íntegros: {good:N0}/{total:N0}";
    }
}

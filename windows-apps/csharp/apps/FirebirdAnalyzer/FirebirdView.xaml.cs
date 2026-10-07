using System.Globalization;
using System.Text;
using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Apps.FirebirdAnalyzer;

public partial class FirebirdView : UserControl
{
    private string? _lastReport;

    public FirebirdView()
    {
        InitializeComponent();
    }

    private Window? Owner => Window.GetWindow(this);

    private void OnSelectFolder(object sender, RoutedEventArgs e)
    {
        var path = Pickers.Folder(Owner, "Selecione a pasta com os bancos");
        if (path is not null) TargetBox.Text = path;
    }

    private void OnSelectFile(object sender, RoutedEventArgs e)
    {
        var path = Pickers.File(Owner, "Selecione um arquivo .fdb ou .gdb", "Firebird DB (*.fdb;*.gdb)|*.fdb;*.gdb|Todos os arquivos (*.*)|*.*");
        if (path is not null) TargetBox.Text = path;
    }

    private void OnSelectGfix(object sender, RoutedEventArgs e)
    {
        var path = Pickers.File(Owner, "Localize o gfix.exe", "gfix.exe|gfix.exe|Executáveis (*.exe)|*.exe");
        if (path is not null) GfixBox.Text = path;
    }

    private void OnClearLog(object sender, RoutedEventArgs e) => Log.Clear();

    private void OnOpenReport(object sender, RoutedEventArgs e)
    {
        if (_lastReport is not null) Browser.ShowInExplorer(_lastReport);
    }

    private void SetStatus(string text, string brush)
    {
        StatusText.Text = text;
        StatusText.Foreground = (System.Windows.Media.Brush)FindResource(brush);
    }

    private static string ReportPath(string timestamp)
    {
        var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "WinPortal", "Firebird Analyzer");
        Directory.CreateDirectory(folder);
        return Path.Combine(folder, $"relatorio_firebird_{timestamp}.csv");
    }

    private static string Csv(string value) =>
        value.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;

    private async void OnRun(object sender, RoutedEventArgs e)
    {
        var target = TargetBox.Text.Trim();
        if (target.Length == 0)
        {
            MessageDialog.Error(Owner, "Erro", "Selecione um alvo.");
            return;
        }
        if (!int.TryParse(TimeoutBox.Text.Trim(), out var timeout) || timeout <= 0)
        {
            MessageDialog.Error(Owner, "Erro", "Informe um tempo limite válido, em segundos.");
            return;
        }

        var user = UserBox.Text;
        var password = PasswordBox.Password;
        var gfix = GfixBox.Text.Trim();
        var resolved = Path.GetFullPath(target);

        RunButton.IsEnabled = false;
        Progress.Value = 0;
        Log.AppendLine($"Iniciando validação em: {target}");
        SetStatus("Executando...", "WarningBrush");

        string? reportPath = null;
        int total = 0, ok = 0, corrupt = 0, undetermined = 0;
        Exception? failure = null;

        await Task.Run(() =>
        {
            try
            {
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
                var rows = new StringBuilder("arquivo,status,return_code,saida_gfix\r\n");

                Log.AppendLine("Coletando arquivos...");
                var databases = GfixRunner.DatabaseFiles(resolved).ToList();
                foreach (var db in databases)
                {
                    total++;
                    var current = total;
                    Dispatcher.BeginInvoke(() =>
                    {
                        Progress.Value = (current - 1.0) / databases.Count;
                        StatusText.Text = $"Validando {current:N0}/{databases.Count:N0}: {Path.GetFileName(db)}";
                    });

                    var (rc, output) = GfixRunner.Validate(gfix, db, user, password, timeout);
                    var status = GfixRunner.Classify(rc, output);
                    if (status == "OK") ok++;
                    else if (status == "Corrompido") corrupt++;
                    else undetermined++;

                    // Quebras de linha viram "\n" literal; no máximo 5.000 caracteres por célula.
                    var flat = output.Replace("\r", "").Replace("\n", "\\n");
                    if (flat.Length > 5000) flat = flat[..5000];
                    rows.Append(Csv(db)).Append(',').Append(Csv(status)).Append(',')
                        .Append(rc.ToString(CultureInfo.InvariantCulture)).Append(',').Append(Csv(flat)).Append("\r\n");

                    Log.AppendLine($"[{status}] {db} (rc={rc})");
                }

                reportPath = ReportPath(timestamp);
                File.WriteAllText(reportPath, rows.ToString(), new UTF8Encoding(false));
            }
            catch (Exception ex)
            {
                failure = ex;
            }
        });

        RunButton.IsEnabled = true;
        Progress.Value = 1;
        if (failure is not null)
        {
            SetStatus("Falha durante a validação.", "DangerBrush");
            MessageDialog.Error(Owner, "Erro", failure.Message);
            return;
        }

        Log.AppendLine("");
        Log.AppendLine($"Resumo: Total: {total}, OK: {ok}, Corrompido: {corrupt}, Indeterminado: {undetermined}");
        Log.AppendLine($"Relatório salvo em: {reportPath}");
        _lastReport = reportPath;
        OpenReportButton.IsEnabled = true;
        SetStatus($"Concluído · Total: {total:N0} · OK: {ok:N0} · Corrompidos: {corrupt:N0} · Indeterminados: {undetermined:N0}", "SuccessBrush");
    }
}

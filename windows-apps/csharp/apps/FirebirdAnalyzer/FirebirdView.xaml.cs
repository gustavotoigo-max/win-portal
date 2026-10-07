using System.Globalization;
using System.Text;
using System.Windows;

namespace WinPortal.Apps.FirebirdAnalyzer;

public partial class FirebirdView : ToolView
{
    private const string ToolId = "firebird_analyzer";

    private sealed record Row(string Database, string Status, int ReturnCode, string Output);

    private List<Row> _rows = [];

    public FirebirdView()
    {
        InitializeComponent();
        Gfix.Text = "gfix";
        ResultsCard.ShowPlaceholder(true);
    }

    private void OnInputChanged(object? sender, EventArgs e) =>
        Actions.CanStart = Target.Text.Length > 0 && Gfix.Text.Length > 0;

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        RequestCancel();
        Progress.Working("Cancelando... o banco atual será interrompido.");
    }

    private static string ReportPath(string timestamp)
    {
        var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Nexotool", "Firebird Analyzer");
        Directory.CreateDirectory(folder);
        return Path.Combine(folder, $"relatorio_firebird_{timestamp}.csv");
    }

    private static string Csv(string value) =>
        value.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;

    /// <summary>Saída do gfix numa linha: quebras viram "\n" literal; no máximo 5.000 caracteres.</summary>
    private static string Flatten(string output)
    {
        var flat = output.Replace("\r", "").Replace("\n", "\\n");
        return flat.Length > 5000 ? flat[..5000] : flat;
    }

    private async void OnRun(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        var target = Target.Text;
        if (target.Length == 0 || (!Directory.Exists(target) && !File.Exists(target)))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta ou um banco válido.");
            return;
        }
        if (!int.TryParse(TimeoutBox.Text.Trim(), out var timeout) || timeout <= 0)
        {
            MessageDialog.Error(Owner, "Erro", "Informe um tempo limite válido, em segundos.");
            return;
        }

        var user = UserBox.Text;
        var password = PasswordBox.Password;
        var gfix = Gfix.Text;
        var resolved = Path.GetFullPath(target);
        ToolSettings.RememberFolder(ToolId, Directory.Exists(resolved) ? resolved : Path.GetDirectoryName(resolved));

        _rows = [];
        Log.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(false);
        var token = BeginWork();
        Log.AppendLine($"Iniciando validação em: {target}");
        Progress.Working("Coletando arquivos...");

        string? reportPath = null;
        var rows = new List<Row>();
        Exception? failure = null;

        await Task.Run(() =>
        {
            try
            {
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
                var databases = GfixRunner.DatabaseFiles(resolved).ToList();
                Log.AppendLine($"{databases.Count:N0} banco(s) encontrado(s).");
                foreach (var db in databases)
                {
                    if (token.IsCancellationRequested) break;
                    var current = rows.Count + 1;
                    Dispatcher.BeginInvoke(() =>
                    {
                        if (!CancelRequested)
                            Progress.Working($"Validando {current:N0}/{databases.Count:N0}: {Path.GetFileName(db)}",
                                (current - 1.0) / databases.Count);
                    });

                    var (rc, output) = GfixRunner.Validate(gfix, db, user, password, timeout, token);
                    if (token.IsCancellationRequested) break;
                    var status = GfixRunner.Classify(rc, output);
                    rows.Add(new Row(db, status, rc, Flatten(output)));
                    Log.AppendLine($"[{status}] {db} (rc={rc})");
                }

                // O relatório é salvo automaticamente, como na versão original.
                var csv = new StringBuilder("arquivo,status,return_code,saida_gfix\r\n");
                foreach (var row in rows)
                    csv.Append(Csv(row.Database)).Append(',').Append(Csv(row.Status)).Append(',')
                        .Append(row.ReturnCode.ToString(CultureInfo.InvariantCulture)).Append(',').Append(Csv(row.Output)).Append("\r\n");
                reportPath = ReportPath(timestamp);
                File.WriteAllText(reportPath, csv.ToString(), new UTF8Encoding(false));
            }
            catch (Exception ex)
            {
                failure = ex;
            }
        });

        var cancelled = CancelRequested;
        EndWork();
        _rows = rows;
        if (failure is not null)
        {
            Progress.Failed("Falha durante a validação.");
            MessageDialog.Error(Owner, "Erro", failure.Message);
            return;
        }

        var ok = rows.Count(r => r.Status == "OK");
        var corrupt = rows.Count(r => r.Status == "Corrompido");
        var undetermined = rows.Count - ok - corrupt;
        var summary = $"{rows.Count:N0} banco(s) · OK: {ok:N0} · Corrompidos: {corrupt:N0} · Indeterminados: {undetermined:N0}";
        ResultsCard.Summary = $"{rows.Count:N0} banco(s)";
        Log.AppendLine("");
        Log.AppendLine($"Resumo: Total: {rows.Count}, OK: {ok}, Corrompido: {corrupt}, Indeterminado: {undetermined}");
        Log.AppendLine($"Relatório salvo em: {reportPath}");

        if (cancelled)
        {
            Progress.Cancelled($"Cancelado · {summary}");
            return;
        }
        if (rows.Count == 0)
        {
            Progress.Done("Concluído · nenhum banco .fdb/.gdb encontrado.");
            MessageDialog.Info(Owner, "Validação concluída", "Nenhum banco .fdb ou .gdb foi encontrado.");
            return;
        }

        if (corrupt > 0 || undetermined > 0) Progress.Warn($"Concluído · {summary}");
        else Progress.Done($"Concluído · {summary}");
        if (MessageDialog.Confirm(Owner, "Validação concluída", $"{summary.Replace(" · ", "\n")}\n\nRelatório salvo em:\n{reportPath}",
                yes: "Abrir pasta", no: "Fechar"))
            Browser.ShowInExplorer(reportPath!);
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        _rows = [];
        Log.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(true);
        Progress.Ready("Selecione uma pasta ou um banco e clique em Validar bancos.");
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        if (_rows.Count == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        ReportExport.SaveCsv(this, ToolId, "relatorio_firebird", ["arquivo", "status", "return_code", "saida_gfix"],
            _rows.Select(r => (IReadOnlyList<string>)[r.Database, r.Status, r.ReturnCode.ToString(CultureInfo.InvariantCulture), r.Output]));
    }

    protected override void OnBusyChanged(bool busy)
    {
        Target.IsEnabled = Gfix.IsEnabled = UserBox.IsEnabled = PasswordBox.IsEnabled = TimeoutBox.IsEnabled = !busy;
        Actions.IsBusy = busy;
        ResultsCard.SetBusy(busy);
    }
}

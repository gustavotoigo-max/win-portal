using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Apps.MdbIntegrity;

public enum RowState { Pending, Running, Ok, Error }

/// <summary>Linha da tabela de resultados.</summary>
public sealed class FileRow(string path) : INotifyPropertyChanged
{
    public string Path { get; } = path;
    public string FileName { get; } = System.IO.Path.GetFileName(path);

    public CheckResult Result { get; private set; } = Pending(path);

    public RowState State { get; private set; } = RowState.Pending;
    public string Status { get; private set; } = "Aguardando";
    public string TablesText { get; private set; } = "—";
    public string RecordsText { get; private set; } = "—";
    public string TimeText { get; private set; } = "—";
    public long TablesSort { get; private set; } = -1;
    public long RecordsSort { get; private set; } = -1;
    public double TimeSort { get; private set; } = -1;
    public string ShortDetail { get; private set; } = System.IO.Path.GetDirectoryName(path) ?? "";

    public event PropertyChangedEventHandler? PropertyChanged;

    /// <summary>
    /// Volta ao estado inicial, descartando o resultado anterior: uma rodada nova
    /// que pare antes deste arquivo não pode exportar status e hash antigos.
    /// </summary>
    public void Reset()
    {
        Result = Pending(Path);
        Set(RowState.Pending, "Aguardando", System.IO.Path.GetDirectoryName(Path) ?? "");
    }

    private static CheckResult Pending(string path) => new()
    {
        Path = path,
        FileName = System.IO.Path.GetFileName(path),
        Status = "Aguardando",
        Detail = "Arquivo ainda não verificado.",
    };
    public void MarkRunning(string detail) => Set(RowState.Running, "Verificando", detail);

    public void Apply(CheckResult result)
    {
        Result = result;
        var first = result.Detail.Split('\n')[0];
        if (first.Length > 120) first = first[..117] + "...";
        Set(result.Ok ? RowState.Ok : RowState.Error, result.Status, first);
        if (result.Ok)
        {
            TablesSort = result.Tables;
            RecordsSort = result.Records;
            TablesText = result.Tables.ToString("N0");
            RecordsText = result.Records.ToString("N0");
        }
        TimeSort = result.Elapsed;
        TimeText = MdbChecker.FormatSeconds(result.Elapsed);
        Notify(nameof(TablesText)); Notify(nameof(RecordsText)); Notify(nameof(TimeText));
        Notify(nameof(TablesSort)); Notify(nameof(RecordsSort)); Notify(nameof(TimeSort));
    }

    private void Set(RowState state, string status, string detail)
    {
        State = state;
        Status = status;
        ShortDetail = detail;
        if (state != RowState.Ok && state != RowState.Error)
        {
            TablesText = RecordsText = TimeText = "—";
            TablesSort = RecordsSort = -1;
            TimeSort = -1;
            Notify(nameof(TablesText)); Notify(nameof(RecordsText)); Notify(nameof(TimeText));
        }
        Notify(nameof(State)); Notify(nameof(Status)); Notify(nameof(ShortDetail));
    }

    private void Notify([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

public partial class MdbView : ToolView
{
    private const string ToolId = "mdb_integrity";

    // Preferência da versão Python; usada só se ainda não houver pasta lembrada.
    private static readonly string LegacySettingsFile =
        System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".mdb_integrity_checker.json");

    private readonly ObservableCollection<FileRow> _rows = [];
    private bool _initialLogged;

    public MdbView()
    {
        InitializeComponent();
        ResultsGrid.ItemsSource = _rows;
        Loaded += (_, _) => InitialLog();
        UpdateCounters();
    }

    private static string InitialDir =>
        ToolSettings.LastFolder(ToolId) ?? LegacyLastDir() ?? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

    private static string? LegacyLastDir()
    {
        try
        {
            if (File.Exists(LegacySettingsFile) && JsonNode.Parse(File.ReadAllText(LegacySettingsFile)) is JsonObject obj &&
                obj["last_dir"]?.GetValue<string>() is { Length: > 0 } dir && Directory.Exists(dir))
                return dir;
        }
        catch
        {
            // Configuração inválida é ignorada, como na versão Python.
        }
        return null;
    }

    private void WriteLog(string message) => Log.AppendLine($"[{DateTime.Now:HH:mm:ss}] {message}");

    private void InitialLog()
    {
        if (_initialLogged) return;
        _initialLogged = true;
        WriteLog("MDB Integrity");
        WriteLog("Adicione arquivos .mdb/.accdb (ou arraste para a lista) e clique em 'Verificar bancos'.");
        var driver = MdbChecker.FindAccessDriver();
        WriteLog(driver is not null
            ? $"Driver Access encontrado: {driver}"
            : "Atenção: nenhum driver ODBC do Access de 64 bits foi encontrado.");
    }

    private void OnAddFiles(object sender, RoutedEventArgs e)
    {
        var paths = Pickers.Files(Owner, "Selecione arquivos .mdb/.accdb",
            "Access Database (*.mdb;*.accdb)|*.mdb;*.accdb|MDB (*.mdb)|*.mdb|ACCDB (*.accdb)|*.accdb|Todos os arquivos (*.*)|*.*",
            InitialDir);
        if (paths.Length == 0) return;
        ToolSettings.RememberFolder(ToolId, System.IO.Path.GetDirectoryName(paths[0]));
        AddPaths(paths);
    }

    private async void OnAddFolder(object sender, RoutedEventArgs e)
    {
        var folder = Pickers.Folder(Owner, "Selecione a pasta com os bancos", InitialDir);
        if (folder is null) return;
        ToolSettings.RememberFolder(ToolId, folder);
        Progress.Working($"Procurando bancos em {folder}...");
        var paths = await Task.Run(() => FileWalker.AllFiles(folder).Where(MdbChecker.HasValidExtension).ToList());
        AddPaths(paths);
        WriteLog($"Pasta adicionada: {folder} ({paths.Count} arquivo(s) encontrado(s))");
        Progress.Ready($"{paths.Count:N0} banco(s) encontrado(s) na pasta. Clique em Verificar bancos.");
    }

    private void AddPaths(IEnumerable<string> paths)
    {
        if (IsBusy) return;
        var existing = new HashSet<string>(_rows.Select(r => r.Path), StringComparer.OrdinalIgnoreCase);
        int added = 0, ignored = 0;
        foreach (var raw in paths)
        {
            string full;
            try { full = System.IO.Path.GetFullPath(raw); }
            catch { ignored++; continue; }

            if (!MdbChecker.HasValidExtension(full) || !existing.Add(full))
            {
                ignored++;
                continue;
            }
            _rows.Add(new FileRow(full));
            added++;
        }
        UpdateCounters();
        if (added > 0) WriteLog($"{added} arquivo(s) adicionado(s).");
        if (ignored > 0) WriteLog($"{ignored} item(ns) ignorado(s) por duplicidade ou extensão inválida.");
    }

    private void OnDragOver(object sender, DragEventArgs e)
    {
        e.Effects = !IsBusy && e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    private async void OnDrop(object sender, DragEventArgs e)
    {
        if (IsBusy || e.Data.GetData(DataFormats.FileDrop) is not string[] dropped) return;
        // Pastas soltas na lista são varridas, arquivos entram diretamente.
        var paths = await Task.Run(() => dropped
            .SelectMany(p => Directory.Exists(p) ? FileWalker.AllFiles(p).Where(MdbChecker.HasValidExtension) : [p])
            .ToList());
        if (dropped.Length > 0)
            ToolSettings.RememberFolder(ToolId, Directory.Exists(dropped[0]) ? dropped[0] : System.IO.Path.GetDirectoryName(dropped[0]));
        AddPaths(paths);
    }

    private void OnRemove(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        var selected = ResultsGrid.SelectedItems.Cast<FileRow>().ToList();
        if (selected.Count == 0)
        {
            MessageDialog.Info(Owner, "Remover", "Selecione na lista os itens que deseja tirar da lista. Nenhum arquivo é apagado.");
            return;
        }
        foreach (var row in selected) _rows.Remove(row);
        UpdateCounters();
        WriteLog($"{selected.Count} item(ns) removido(s) da lista.");
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        _rows.Clear();
        Log.Clear();
        UpdateCounters();
        Progress.Ready("Adicione os bancos .mdb/.accdb e clique em Verificar bancos.");
    }

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        if (!IsBusy) return;
        RequestCancel();
        WriteLog("Cancelamento solicitado. Aguardando a etapa atual terminar...");
        Progress.Working("Cancelando... aguarde a etapa atual terminar.");
    }

    private async void OnCheck(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        if (_rows.Count == 0)
        {
            MessageDialog.Info(Owner, "Nenhum arquivo", "Adicione pelo menos um arquivo .mdb ou .accdb.");
            return;
        }

        var options = new CheckOptions
        {
            DeepHash = DeepHashCheck.IsChecked == true,
            IncludeSystemTables = SystemTablesCheck.IsChecked == true,
            StopOnFirstError = StopOnErrorCheck.IsChecked == true,
        };

        var rows = _rows.ToList();
        foreach (var row in rows) row.Reset();
        UpdateCounters();
        var token = BeginWork();
        Progress.Working($"Verificando 0/{rows.Count:N0}", 0);
        WriteLog("Iniciando verificação...");

        var done = 0;
        await Task.Run(() =>
        {
            foreach (var row in rows)
            {
                if (token.IsCancellationRequested) break;
                var index = done + 1;
                Dispatcher.Invoke(() =>
                {
                    row.MarkRunning(System.IO.Path.GetDirectoryName(row.Path) ?? "");
                    if (!CancelRequested)
                        Progress.Working($"Verificando {index:N0}/{rows.Count:N0}: {row.FileName}", (double)done / rows.Count);
                });

                var result = MdbChecker.Check(row.Path, options, token,
                    message => WriteLog($"{row.FileName}: {message}"),
                    (table, read, expected) => Dispatcher.BeginInvoke(() => row.MarkRunning($"{table}: {read:N0}/{expected:N0}")));

                done++;
                var progress = (double)done / rows.Count;
                Dispatcher.Invoke(() =>
                {
                    row.Apply(result);
                    if (!CancelRequested) Progress.Report(progress);
                    UpdateCounters();
                    WriteLog(result.Ok
                        ? $"OK: {result.FileName} | tabelas={result.Tables} | registros={result.Records} | tempo={MdbChecker.FormatSeconds(result.Elapsed)}"
                        : $"ERRO: {result.FileName} | {result.Detail.Split('\n')[0]}");
                });

                if (options.StopOnFirstError && !result.Ok)
                {
                    WriteLog("Parando no primeiro erro, conforme configurado.");
                    break;
                }
            }
        });

        // Arquivos que não chegaram a ser verificados voltam para "Aguardando".
        foreach (var row in rows.Where(r => r.State == RowState.Running)) row.Reset();

        var cancelled = CancelRequested;
        EndWork();
        var ok = _rows.Count(r => r.State == RowState.Ok);
        var errors = _rows.Count(r => r.State == RowState.Error);
        var pending = _rows.Count - ok - errors;
        WriteLog(cancelled ? "Verificação cancelada." : "Verificação concluída.");
        UpdateCounters();

        var summary = $"OK: {ok:N0} · Erros: {errors:N0}" + (pending > 0 ? $" · Não verificados: {pending:N0}" : "");
        if (cancelled)
        {
            Progress.Cancelled($"Cancelado · {summary}");
            return;
        }
        if (errors > 0)
        {
            Progress.Warn($"Concluído · {summary}");
            MessageDialog.Warning(Owner, "Verificação concluída",
                $"{ok:N0} banco(s) íntegro(s) e {errors:N0} com erro.\nClique duas vezes em um arquivo para ver os detalhes.");
            return;
        }
        Progress.Done($"Concluído · {summary}");
        MessageDialog.Success(Owner, "Verificação concluída", $"{ok:N0} banco(s) verificado(s) sem erros.");
    }

    protected override void OnBusyChanged(bool busy)
    {
        Actions.IsBusy = busy;
        Actions.CanStart = _rows.Count > 0;
        ResultsCard.SetBusy(busy);
        AddFilesButton.IsEnabled = AddFolderButton.IsEnabled = RemoveButton.IsEnabled = !busy;
        DeepHashCheck.IsEnabled = SystemTablesCheck.IsEnabled = StopOnErrorCheck.IsEnabled = !busy;
    }

    private void UpdateCounters()
    {
        var total = _rows.Count;
        Actions.CanStart = total > 0;
        if (total == 0)
        {
            ResultsCard.Summary = "Nenhum arquivo na lista";
            return;
        }
        var ok = _rows.Count(r => r.State == RowState.Ok);
        var errors = _rows.Count(r => r.State == RowState.Error);
        ResultsCard.Summary = $"Total: {total}  ·  OK: {ok}  ·  Erro: {errors}  ·  Pendentes: {total - ok - errors}";
    }

    private void OnGridDoubleClick(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (ResultsGrid.SelectedItem is not FileRow row) return;
        var r = row.Result;
        var content =
            $"Arquivo: {r.Path}\n" +
            $"Status: {r.Status}\n" +
            $"Verificado em: {r.CheckedAt}\n" +
            $"Driver: {(r.Driver.Length > 0 ? r.Driver : "-")}\n" +
            $"Tabelas: {r.Tables}\n" +
            $"Registros: {r.Records}\n" +
            $"Tempo: {MdbChecker.FormatSeconds(r.Elapsed)}\n" +
            $"SHA-256 da leitura: {(r.ContentHash.Length > 0 ? r.ContentHash : "-")}\n\n" +
            $"Detalhes:\n{r.Detail}";
        new TextViewerWindow(Owner, $"Detalhes - {r.FileName}", content).ShowDialog();
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        if (_rows.Count == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        var path = ReportExport.SaveCsv(this, ToolId, "mdb_integrity_report",
            ["arquivo", "caminho", "status", "tabelas", "registros", "tempo_segundos", "driver", "sha256_leitura", "verificado_em", "detalhe"],
            _rows.Select(x => x.Result).Select(r => (IReadOnlyList<string>)[r.FileName, r.Path, r.Status,
                r.Tables.ToString(CultureInfo.InvariantCulture), r.Records.ToString(CultureInfo.InvariantCulture),
                r.Elapsed.ToString("0.0000", CultureInfo.InvariantCulture), r.Driver, r.ContentHash, r.CheckedAt,
                r.Detail.Replace("\r", " ").Replace("\n", " | ")]));
        if (path is not null) WriteLog($"Relatório exportado: {path}");
    }
}

using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
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

    public CheckResult Result { get; private set; } = new()
    {
        Path = path,
        FileName = System.IO.Path.GetFileName(path),
        Status = "Aguardando",
        Detail = "Arquivo ainda não verificado.",
    };

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

    public void Reset() => Set(RowState.Pending, "Aguardando", System.IO.Path.GetDirectoryName(Path) ?? "");
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

public partial class MdbView : UserControl
{
    private static readonly string SettingsFile =
        System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".mdb_integrity_checker.json");

    private readonly ObservableCollection<FileRow> _rows = [];
    private readonly JsonObject _settings = LoadSettings();
    private CancellationTokenSource? _cancel;
    private bool _running;

    public MdbView()
    {
        InitializeComponent();
        ResultsGrid.ItemsSource = _rows;
        Loaded += (_, _) => InitialLog();
        UpdateCounters();
    }

    private Window? Owner => Window.GetWindow(this);

    private string InitialDir =>
        _settings["last_dir"]?.GetValue<string>() is { Length: > 0 } dir && Directory.Exists(dir)
            ? dir
            : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

    private void WriteLog(string message) => Log.AppendLine($"[{DateTime.Now:HH:mm:ss}] {message}");

    private bool _initialLogged;

    private void InitialLog()
    {
        if (_initialLogged) return;
        _initialLogged = true;
        WriteLog($"{Program.Product.AppName} v{Program.Product.Version}");
        WriteLog("Adicione arquivos .mdb/.accdb (ou arraste para a lista) e clique em 'Verificar bancos'.");
        var driver = MdbChecker.FindAccessDriver();
        WriteLog(driver is not null
            ? $"Driver Access encontrado: {driver}"
            : "Atenção: nenhum driver ODBC do Access de 64 bits foi encontrado.");
    }

    private static JsonObject LoadSettings()
    {
        try
        {
            if (File.Exists(SettingsFile) && JsonNode.Parse(File.ReadAllText(SettingsFile)) is JsonObject obj) return obj;
        }
        catch
        {
            // Configuração inválida é ignorada, como na versão Python.
        }
        return [];
    }

    private void SaveLastDir(string? dir)
    {
        if (string.IsNullOrEmpty(dir)) return;
        _settings["last_dir"] = dir;
        try
        {
            File.WriteAllText(SettingsFile, _settings.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
        catch
        {
            // Falha ao salvar preferências não impede o uso.
        }
    }

    private void OnAddFiles(object sender, RoutedEventArgs e)
    {
        var paths = Pickers.Files(Owner, "Selecione arquivos .mdb/.accdb",
            "Access Database (*.mdb;*.accdb)|*.mdb;*.accdb|MDB (*.mdb)|*.mdb|ACCDB (*.accdb)|*.accdb|Todos os arquivos (*.*)|*.*",
            InitialDir);
        if (paths.Length == 0) return;
        SaveLastDir(System.IO.Path.GetDirectoryName(paths[0]));
        AddPaths(paths);
    }

    private async void OnAddFolder(object sender, RoutedEventArgs e)
    {
        var folder = Pickers.Folder(Owner, "Selecione uma pasta", InitialDir);
        if (folder is null) return;
        SaveLastDir(folder);
        var paths = await Task.Run(() => FileWalker.AllFiles(folder).Where(MdbChecker.HasValidExtension).ToList());
        AddPaths(paths);
        WriteLog($"Pasta adicionada: {folder} ({paths.Count} arquivo(s) encontrado(s))");
    }

    private void AddPaths(IEnumerable<string> paths)
    {
        if (_running) return;
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
        e.Effects = !_running && e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    private async void OnDrop(object sender, DragEventArgs e)
    {
        if (_running || e.Data.GetData(DataFormats.FileDrop) is not string[] dropped) return;
        // Pastas soltas na lista são varridas, arquivos entram diretamente.
        var paths = await Task.Run(() => dropped
            .SelectMany(p => Directory.Exists(p) ? FileWalker.AllFiles(p).Where(MdbChecker.HasValidExtension) : [p])
            .ToList());
        AddPaths(paths);
    }

    private void OnRemove(object sender, RoutedEventArgs e)
    {
        if (_running)
        {
            MessageDialog.Warning(Owner, "Atenção", "Não remova arquivos durante a verificação.");
            return;
        }
        var selected = ResultsGrid.SelectedItems.Cast<FileRow>().ToList();
        if (selected.Count == 0) return;
        foreach (var row in selected) _rows.Remove(row);
        UpdateCounters();
        WriteLog($"{selected.Count} item(ns) removido(s).");
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (_running)
        {
            MessageDialog.Warning(Owner, "Atenção", "Não limpe a lista durante a verificação.");
            return;
        }
        _rows.Clear();
        Progress.Value = 0;
        StatusText.Text = "Lista limpa";
        UpdateCounters();
        WriteLog("Lista limpa.");
    }

    private void OnClearLog(object sender, RoutedEventArgs e) => Log.Clear();

    private async void OnCheck(object sender, RoutedEventArgs e)
    {
        if (_running) return;
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
        _cancel = new CancellationTokenSource();
        var token = _cancel.Token;
        SetRunning(true);
        Progress.Value = 0;
        StatusText.Text = "Verificação em andamento...";
        WriteLog("Iniciando verificação...");

        var done = 0;
        await Task.Run(() =>
        {
            foreach (var row in rows)
            {
                if (token.IsCancellationRequested) break;
                Dispatcher.Invoke(() =>
                {
                    row.MarkRunning(System.IO.Path.GetDirectoryName(row.Path) ?? "");
                    StatusText.Text = $"Verificando: {row.FileName}";
                });

                var result = MdbChecker.Check(row.Path, options, token,
                    message => WriteLog($"{row.FileName}: {message}"),
                    (table, read, expected) => Dispatcher.BeginInvoke(() => row.MarkRunning($"{table}: {read:N0}/{expected:N0}")));

                done++;
                var progress = (double)done / rows.Count;
                Dispatcher.Invoke(() =>
                {
                    row.Apply(result);
                    Progress.Value = progress;
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

        var cancelled = token.IsCancellationRequested;
        SetRunning(false);
        var ok = _rows.Count(r => r.State == RowState.Ok);
        var errors = _rows.Count(r => r.State == RowState.Error);
        StatusText.Text = cancelled
            ? $"Verificação cancelada. OK: {ok} | Erros: {errors}"
            : $"Concluído. OK: {ok} | Erros: {errors}";
        WriteLog(cancelled ? "Verificação cancelada." : "Verificação concluída.");
        UpdateCounters();
    }

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        if (!_running || _cancel is null) return;
        _cancel.Cancel();
        CancelButton.IsEnabled = false;
        WriteLog("Cancelamento solicitado. Aguardando a etapa atual terminar...");
        StatusText.Text = "Cancelando...";
    }

    private void SetRunning(bool running)
    {
        _running = running;
        CheckButton.IsEnabled = !running;
        CancelButton.IsEnabled = running;
        AddFilesButton.IsEnabled = !running;
        AddFolderButton.IsEnabled = !running;
        RemoveButton.IsEnabled = !running;
        ClearButton.IsEnabled = !running;
        ExportButton.IsEnabled = !running;
        DeepHashCheck.IsEnabled = SystemTablesCheck.IsEnabled = StopOnErrorCheck.IsEnabled = !running;
    }

    private void UpdateCounters()
    {
        var total = _rows.Count;
        if (total == 0)
        {
            CounterText.Text = "Aguardando arquivos";
            return;
        }
        var ok = _rows.Count(r => r.State == RowState.Ok);
        var errors = _rows.Count(r => r.State == RowState.Error);
        CounterText.Text = $"Total: {total}  ·  OK: {ok}  ·  Erro: {errors}  ·  Pendentes: {total - ok - errors}";
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
            MessageDialog.Info(Owner, "Sem resultados", "Não há resultados para exportar.");
            return;
        }
        var path = Pickers.SaveFile(Owner, "Exportar relatório CSV", "CSV (*.csv)|*.csv|Todos os arquivos (*.*)|*.*",
            $"mdb_integrity_report_{DateTime.Now:yyyyMMdd_HHmmss}.csv", InitialDir, ".csv");
        if (path is null) return;

        try
        {
            var sb = new StringBuilder();
            sb.AppendLine(Csv("arquivo", "caminho", "status", "tabelas", "registros", "tempo_segundos", "driver",
                "sha256_leitura", "verificado_em", "detalhe"));
            foreach (var r in _rows.Select(x => x.Result))
                sb.AppendLine(Csv(r.FileName, r.Path, r.Status, r.Tables.ToString(CultureInfo.InvariantCulture),
                    r.Records.ToString(CultureInfo.InvariantCulture), r.Elapsed.ToString("0.0000", CultureInfo.InvariantCulture),
                    r.Driver, r.ContentHash, r.CheckedAt, r.Detail.Replace("\r", " ").Replace("\n", " | ")));
            File.WriteAllText(path, sb.ToString(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
            WriteLog($"Relatório exportado: {path}");
            MessageDialog.Success(Owner, "Exportado", $"Relatório salvo em:\n{path}");
        }
        catch (Exception ex)
        {
            MessageDialog.Error(Owner, "Erro ao exportar", ex.Message);
        }
    }

    private static string Csv(params string[] fields) => string.Join(";", fields.Select(f =>
        f.IndexOfAny([';', '"', '\n', '\r']) >= 0 ? "\"" + f.Replace("\"", "\"\"") + "\"" : f));
}

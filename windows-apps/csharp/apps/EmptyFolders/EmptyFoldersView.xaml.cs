using System.Windows;

namespace WinPortal.Apps.EmptyFolders;

/// <summary>Removedor de pastas vazias (empty_folders/core/tool.py).</summary>
public partial class EmptyFoldersView : ToolView
{
    private const string ToolId = "empty_folders";

    // Última lista e o que aconteceu com cada pasta, para exportar.
    private List<string> _folders = [];
    private Dictionary<string, string> _outcome = new(StringComparer.OrdinalIgnoreCase);
    // Pastas oferecidas ao botão Apagar (última busca concluída).
    private (string Root, List<string> Folders)? _pending;

    public EmptyFoldersView()
    {
        InitializeComponent();
        ResultsCard.ShowPlaceholder(true);
    }

    private void OnPathChanged(object? sender, EventArgs e) => Actions.CanStart = Folder.Text.Length > 0;

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        RequestCancel();
        Progress.Working("Cancelando... aguarde a etapa atual terminar.");
    }

    private async void OnStart(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        var root = Folder.Text;
        if (root.Length == 0 || !Directory.Exists(root))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }

        ToolSettings.RememberFolder(ToolId, root);
        ShowList([]);
        var token = BeginWork();
        Progress.Working("Procurando pastas vazias...", 0);

        List<string> found;
        var readFailures = new List<string>();
        try
        {
            found = await Task.Run(() => FindEmpty(root, readFailures, token), token);
        }
        catch (OperationCanceledException)
        {
            EndWork();
            Progress.Cancelled("Cancelado · busca interrompida.");
            return;
        }
        catch (Exception ex)
        {
            EndWork();
            Progress.Failed("Falha ao listar as pastas vazias.");
            MessageDialog.Error(Owner, "Erro", $"Falha ao listar pastas vazias:\n{ex.Message}");
            return;
        }

        ShowList(found);
        if (readFailures.Count > 0)
        {
            Log.AppendLine("");
            foreach (var line in readFailures) Log.AppendLine(line);
        }
        if (found.Count == 0)
        {
            EndWork();
            Progress.Done("Concluído · nenhuma pasta vazia encontrada.");
            MessageDialog.Success(Owner, "Busca concluída", "Nenhuma pasta vazia foi encontrada.");
            return;
        }

        EndWork();
        _pending = (root, found);
        ResultsCard.ShowDelete($"Apagar {found.Count:N0} pasta(s)...");
        Progress.Warn($"Concluído · {found.Count:N0} pasta(s) vazia(s) encontrada(s). " +
                      "Nada foi apagado: confira a lista e, se quiser, use Apagar.");
    }

    private async void OnDelete(object sender, RoutedEventArgs e)
    {
        if (IsBusy || _pending is not { } pending || pending.Folders.Count == 0) return;
        var (root, found) = pending;
        if (!MessageDialog.Confirm(Owner, "Confirmar exclusão",
                $"{found.Count:N0} pasta(s) vazia(s), listadas na tela, serão apagadas. " +
                "Cada pasta é conferida de novo e só é removida se continuar vazia; a pasta selecionada é preservada.\n\nDeseja apagá-las?",
                yes: "Apagar", no: "Cancelar", destructive: true))
            return;

        _pending = null;
        ResultsCard.ShowDelete(null);
        var token = BeginWork();
        Progress.Working("Apagando pastas vazias...", 0);
        Log.AppendLine("");
        Log.AppendLine("Iniciando remoção...");
        var (removed, failed, cancelled) = await Task.Run(() => Remove(root, found, token));
        EndWork();

        var summary = $"{removed:N0} pasta(s) removida(s) · {failed:N0} falha(s)";
        if (cancelled)
        {
            Progress.Cancelled($"Cancelado · {summary}");
            return;
        }
        if (failed > 0)
        {
            Progress.Warn($"Concluído com falhas · {summary}");
            MessageDialog.Warning(Owner, "Concluído com falhas", $"{removed:N0} pasta(s) removida(s).\n{failed:N0} não puderam ser removidas (veja o log).");
            return;
        }
        Progress.Done($"Concluído · {summary}");
        MessageDialog.Success(Owner, "Concluído", $"{removed:N0} pasta(s) vazia(s) removida(s).");
    }

    private List<string> FindEmpty(string root, List<string> readFailures, CancellationToken token)
    {
        // os.walk(topdown=False): as subpastas aparecem antes das pastas-mãe.
        var folders = new List<string>();
        foreach (var (directory, names) in FileWalker.BottomUp(root))
        {
            token.ThrowIfCancellationRequested();
            foreach (var name in names) folders.Add(Path.Combine(directory, name));
        }

        var removable = new List<string>();
        var removableSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var lastReport = Environment.TickCount64;

        for (var index = 0; index < folders.Count; index++)
        {
            token.ThrowIfCancellationRequested();
            var folder = folders[index];
            try
            {
                var entries = new DirectoryInfo(folder).EnumerateFileSystemInfos("*", new EnumerationOptions
                {
                    AttributesToSkip = 0,
                    IgnoreInaccessible = false,
                    RecurseSubdirectories = false,
                }).ToList();

                var allRemovable = entries.All(entry =>
                    entry is DirectoryInfo && !entry.Attributes.HasFlag(FileAttributes.ReparsePoint) &&
                    removableSet.Contains(entry.FullName));
                if (entries.Count == 0 || allRemovable)
                {
                    removable.Add(folder);
                    removableSet.Add(folder);
                }
            }
            catch (Exception ex)
            {
                readFailures.Add($"FALHA AO LER: {folder} - {ex.Message}");
            }

            if (Environment.TickCount64 - lastReport > 50 || index == folders.Count - 1)
            {
                lastReport = Environment.TickCount64;
                var (i, total) = (index + 1, folders.Count);
                Dispatcher.BeginInvoke(() =>
                {
                    if (!CancelRequested) Progress.Working($"Verificando {i:N0}/{total:N0} pasta(s)...", (double)i / total);
                });
            }
        }
        return removable;
    }

    private (int Removed, int Failed, bool Cancelled) Remove(string root, List<string> folders, CancellationToken token)
    {
        int removed = 0, failed = 0;
        var rootAbs = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
        var outcome = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var lastReport = 0L;
        for (var index = 0; index < folders.Count; index++)
        {
            if (token.IsCancellationRequested)
            {
                Log.AppendLine("*** Operação cancelada pelo usuário ***");
                break;
            }

            var folder = folders[index];
            try
            {
                if (string.Equals(Path.GetFullPath(folder).TrimEnd(Path.DirectorySeparatorChar), rootAbs, StringComparison.OrdinalIgnoreCase))
                    continue;
                if (Directory.Exists(folder) && !Directory.EnumerateFileSystemEntries(folder).Any())
                {
                    Directory.Delete(folder, recursive: false);
                    removed++;
                    outcome[folder] = "Removida";
                    Log.AppendLine($"REMOVIDA: {folder}");
                }
                else
                {
                    outcome[folder] = "Não estava mais vazia";
                }
            }
            catch (DirectoryNotFoundException)
            {
                outcome[folder] = "Não encontrada";
            }
            catch (Exception ex)
            {
                failed++;
                outcome[folder] = $"Falha: {ex.Message}";
                Log.AppendLine($"FALHA: {folder} - {ex.Message}");
            }

            if (Environment.TickCount64 - lastReport > 50 || index == folders.Count - 1)
            {
                lastReport = Environment.TickCount64;
                var (i, r, f) = (index + 1, removed, failed);
                Dispatcher.BeginInvoke(() =>
                {
                    if (!CancelRequested)
                        Progress.Working($"Apagando {i:N0}/{folders.Count:N0} · {r:N0} removida(s) · {f:N0} falha(s)", (double)i / folders.Count);
                });
            }
        }
        Dispatcher.Invoke(() => { foreach (var (path, status) in outcome) _outcome[path] = status; });
        return (removed, failed, token.IsCancellationRequested);
    }

    private void ShowList(List<string> folders)
    {
        _pending = null;
        ResultsCard.ShowDelete(null);
        _folders = folders;
        _outcome = folders.ToDictionary(f => f, _ => "Vazia", StringComparer.OrdinalIgnoreCase);
        Log.Clear();
        foreach (var folder in folders) Log.AppendLine(folder);
        ResultsCard.Summary = folders.Count > 0 ? $"{folders.Count:N0} pasta(s)" : "";
        ResultsCard.ShowPlaceholder(folders.Count == 0);
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        ShowList([]);
        Progress.Ready("Selecione uma pasta e clique em Procurar pastas vazias.");
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        if (_folders.Count == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        ReportExport.SaveCsv(this, ToolId, "pastas_vazias", ["pasta", "situacao"],
            _folders.Select(f => (IReadOnlyList<string>)[f, _outcome.GetValueOrDefault(f, "Vazia")]));
    }

    protected override void OnBusyChanged(bool busy)
    {
        Folder.IsEnabled = !busy;
        Actions.IsBusy = busy;
        ResultsCard.SetBusy(busy);
    }
}

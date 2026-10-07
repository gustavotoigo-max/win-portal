using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Apps.EmptyFolders;

/// <summary>Removedor de pastas vazias (empty_folders/core/tool.py).</summary>
public partial class EmptyFoldersView : UserControl
{
    private List<string> _emptyFolders = [];
    private string? _previewRoot;
    private int _previewToken;
    private Task? _previewTask;
    private Task? _cleanTask;
    private volatile bool _stop;

    public EmptyFoldersView()
    {
        InitializeComponent();
    }

    private Window? Owner => Window.GetWindow(this);
    private bool Cleaning => _cleanTask is { IsCompleted: false };
    private bool Previewing => _previewTask is { IsCompleted: false };

    private void OnSelect(object sender, RoutedEventArgs e)
    {
        var path = Pickers.Folder(Owner, "Selecione a pasta raiz", PathBox.Text);
        if (path is null) return;
        PathBox.Text = path;
        StartPreview(path);
    }

    private void OnList(object sender, RoutedEventArgs e)
    {
        var root = PathBox.Text.Trim();
        if (root.Length == 0 || !Directory.Exists(root))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }
        StartPreview(root);
    }

    private void OnClearLog(object sender, RoutedEventArgs e) => Log.Clear();

    private void StartPreview(string root)
    {
        if (Cleaning)
        {
            MessageDialog.Info(Owner, "Atenção", "Aguarde a limpeza atual terminar.");
            return;
        }

        var token = ++_previewToken;
        _emptyFolders = [];
        _previewRoot = root;
        Progress.Value = 0;
        Log.Clear();
        CleanButton.IsEnabled = false;
        CancelButton.IsEnabled = false;
        StatusText.Text = "Procurando pastas vazias...";

        _previewTask = Task.Run(() => PreviewWorker(root, token));
    }

    private void PreviewWorker(string root, int token)
    {
        try
        {
            // os.walk(topdown=False): as subpastas aparecem antes das pastas-mãe.
            var folders = new List<string>();
            foreach (var (directory, names) in FileWalker.BottomUp(root))
                foreach (var name in names) folders.Add(Path.Combine(directory, name));

            var removable = new List<string>();
            var removableSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var lastReport = Environment.TickCount64;

            for (var index = 0; index < folders.Count; index++)
            {
                if (token != _previewToken) return;
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
                    Log.AppendLine($"FALHA AO LER: {folder} - {ex.Message}");
                }

                if (Environment.TickCount64 - lastReport > 50 || index == folders.Count - 1)
                {
                    lastReport = Environment.TickCount64;
                    var pct = folders.Count > 0 ? (index + 1.0) / folders.Count : 1.0;
                    Dispatcher.BeginInvoke(() => { if (token == _previewToken) Progress.Value = pct; });
                }
            }

            Dispatcher.BeginInvoke(() => ShowPreview(removable, root, token));
        }
        catch (Exception ex)
        {
            Dispatcher.BeginInvoke(() =>
            {
                MessageDialog.Error(Owner, "Erro", $"Falha ao listar pastas vazias:\n{ex.Message}");
                CleanButton.IsEnabled = true;
            });
        }
    }

    private void ShowPreview(List<string> folders, string root, int token)
    {
        if (token != _previewToken) return;
        _emptyFolders = folders;
        _previewRoot = root;
        Progress.Value = 1;
        Log.Clear();

        if (folders.Count == 0)
        {
            StatusText.Text = "Nenhuma pasta vazia encontrada.";
            Log.AppendLine("Nenhuma pasta vazia encontrada.");
            CleanButton.IsEnabled = false;
            return;
        }

        StatusText.Text = $"{folders.Count:N0} pasta(s) vazia(s) encontrada(s). Confira a lista antes de apagar.";
        Log.AppendLine("Pastas vazias encontradas:");
        foreach (var folder in folders) Log.AppendLine(folder);
        CleanButton.IsEnabled = true;
    }

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        _stop = true;
        StatusText.Text = "Cancelando... aguarde a etapa atual terminar.";
        CancelButton.IsEnabled = false;
    }

    private void OnClean(object sender, RoutedEventArgs e)
    {
        if (Cleaning)
        {
            MessageDialog.Info(Owner, "Atenção", "Uma limpeza já está em andamento.");
            return;
        }
        if (Previewing)
        {
            MessageDialog.Info(Owner, "Atenção", "Aguarde a listagem das pastas vazias terminar.");
            return;
        }

        var root = PathBox.Text.Trim();
        if (root.Length == 0 || !Directory.Exists(root))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }
        if (_previewRoot != root || _emptyFolders.Count == 0)
        {
            MessageDialog.Info(Owner, "Nenhuma pasta vazia", "Nenhuma pasta vazia foi listada para remoção.");
            return;
        }

        if (!MessageDialog.Confirm(Owner, "Confirmar limpeza",
                $"Deseja apagar {_emptyFolders.Count:N0} pasta(s) vazia(s) listada(s)?\n\nA pasta raiz selecionada será preservada.",
                yes: "Apagar", no: "Cancelar", destructive: true))
            return;

        _stop = false;
        Progress.Value = 0;
        CleanButton.IsEnabled = false;
        ListButton.IsEnabled = false;
        SelectButton.IsEnabled = false;
        CancelButton.IsEnabled = true;
        StatusText.Text = "Apagando pastas vazias listadas...";
        Log.AppendLine("");
        Log.AppendLine("Iniciando remoção...");

        var folders = _emptyFolders.ToList();
        _cleanTask = Task.Run(() => CleanWorker(root, folders));
    }

    private void CleanWorker(string root, List<string> folders)
    {
        int removed = 0, failed = 0;
        try
        {
            var rootAbs = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
            var lastReport = 0L;
            for (var index = 0; index < folders.Count; index++)
            {
                if (_stop)
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
                        Log.AppendLine($"REMOVIDA: {folder}");
                    }
                }
                catch (DirectoryNotFoundException) { }
                catch (Exception ex)
                {
                    failed++;
                    Log.AppendLine($"FALHA: {folder} - {ex.Message}");
                }

                if (Environment.TickCount64 - lastReport > 50 || index == folders.Count - 1)
                {
                    lastReport = Environment.TickCount64;
                    var (i, r, f) = (index + 1, removed, failed);
                    Dispatcher.BeginInvoke(() =>
                    {
                        Progress.Value = (double)i / folders.Count;
                        StatusText.Text = $"Verificando {i:N0}/{folders.Count:N0} | Removidas: {r:N0} | Falhas: {f:N0}";
                    });
                }
            }
        }
        finally
        {
            Dispatcher.BeginInvoke(() =>
            {
                _emptyFolders = [];
                StatusText.Text = $"Concluído. Pastas vazias removidas: {removed:N0}. Falhas: {failed:N0}.";
                CleanButton.IsEnabled = false;
                CancelButton.IsEnabled = false;
                ListButton.IsEnabled = true;
                SelectButton.IsEnabled = true;
            });
        }
    }
}

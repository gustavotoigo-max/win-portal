using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Apps.RenameFolder;

/// <summary>
/// Renomeação recursiva (rename_folder/core/tool.py). A varredura é de baixo para
/// cima (os.walk topdown=False): as subpastas mais profundas são renomeadas antes
/// das pastas-mãe, preservando os caminhos durante o processo.
/// </summary>
public partial class RenameFolderView : UserControl
{
    public RenameFolderView()
    {
        InitializeComponent();
    }

    private Window? Owner => Window.GetWindow(this);

    private void OnSelect(object sender, RoutedEventArgs e)
    {
        var folder = Pickers.Folder(Owner, "Selecione a pasta raiz", PathBox.Text);
        if (folder is not null) PathBox.Text = folder;
    }

    private async void OnRun(object sender, RoutedEventArgs e)
    {
        var root = PathBox.Text.Trim();
        var term = TermBox.Text.Trim();
        var newBase = NewNameBox.Text.Trim();

        if (root.Length == 0 || term.Length == 0 || newBase.Length == 0)
        {
            MessageDialog.Warning(Owner, "Aviso", "Preencha todos os campos.");
            return;
        }

        Log.Clear();
        SetBusy(true);
        StatusText.Text = "Renomeando pastas...";

        var renamed = 0;
        Exception? failure = null;
        await Task.Run(() =>
        {
            var counter = 1;
            try
            {
                foreach (var (directory, names) in FileWalker.BottomUp(root))
                {
                    foreach (var name in names)
                    {
                        if (!name.Contains(term, StringComparison.Ordinal)) continue;

                        var newName = $"{newBase} ({counter})";
                        var oldPath = Path.Combine(directory, name);
                        var newPath = Path.Combine(directory, newName);

                        // Evita colisão com nomes já existentes no disco.
                        while (Directory.Exists(newPath) || File.Exists(newPath))
                        {
                            counter++;
                            newName = $"{newBase} ({counter})";
                            newPath = Path.Combine(directory, newName);
                        }

                        Directory.Move(oldPath, newPath);
                        counter++;
                        renamed++;
                        Log.AppendLine($"{oldPath} -> {newPath}");
                        var count = renamed;
                        Dispatcher.BeginInvoke(() => StatusText.Text = $"{count:N0} pasta(s) renomeada(s)...");
                    }
                }
            }
            catch (Exception ex)
            {
                failure = ex;
            }
        });

        SetBusy(false);
        Progress.Value = 1;
        if (failure is not null)
        {
            StatusText.Text = $"Interrompido após {renamed:N0} pasta(s) renomeada(s).";
            MessageDialog.Error(Owner, "Erro", failure.Message);
            return;
        }

        StatusText.Text = $"Concluído. {renamed:N0} pasta(s) renomeada(s).";
        MessageDialog.Success(Owner, "Sucesso", $"{renamed:N0} pastas renomeadas.");
    }

    private void SetBusy(bool busy)
    {
        RunButton.IsEnabled = !busy;
        SelectButton.IsEnabled = !busy;
        PathBox.IsEnabled = !busy;
        TermBox.IsEnabled = !busy;
        NewNameBox.IsEnabled = !busy;
        if (busy) Progress.Value = 0;
    }
}

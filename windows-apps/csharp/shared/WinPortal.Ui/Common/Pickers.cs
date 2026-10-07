using System.Windows;
using Microsoft.Win32;

namespace WinPortal.Ui.Common;

/// <summary>Seletores nativos de pasta e arquivo.</summary>
public static class Pickers
{
    public static string? Folder(Window? owner, string title, string? initial = null)
    {
        var dialog = new OpenFolderDialog { Title = title, Multiselect = false };
        if (!string.IsNullOrWhiteSpace(initial) && Directory.Exists(initial)) dialog.InitialDirectory = initial;
        return dialog.ShowDialog(owner) == true ? dialog.FolderName : null;
    }

    public static string? File(Window? owner, string title, string filter = "Todos os arquivos (*.*)|*.*", string? initial = null)
    {
        var dialog = new OpenFileDialog { Title = title, Filter = filter, CheckFileExists = true };
        if (!string.IsNullOrWhiteSpace(initial) && Directory.Exists(initial)) dialog.InitialDirectory = initial;
        return dialog.ShowDialog(owner) == true ? dialog.FileName : null;
    }

    public static string[] Files(Window? owner, string title, string filter, string? initial = null)
    {
        var dialog = new OpenFileDialog { Title = title, Filter = filter, Multiselect = true, CheckFileExists = true };
        if (!string.IsNullOrWhiteSpace(initial) && Directory.Exists(initial)) dialog.InitialDirectory = initial;
        return dialog.ShowDialog(owner) == true ? dialog.FileNames : [];
    }

    public static string? SaveFile(Window? owner, string title, string filter = "Todos os arquivos (*.*)|*.*",
        string? fileName = null, string? initial = null, string? defaultExt = null)
    {
        var dialog = new SaveFileDialog { Title = title, Filter = filter, OverwritePrompt = true };
        if (fileName is not null) dialog.FileName = fileName;
        if (defaultExt is not null) dialog.DefaultExt = defaultExt;
        if (!string.IsNullOrWhiteSpace(initial) && Directory.Exists(initial)) dialog.InitialDirectory = initial;
        return dialog.ShowDialog(owner) == true ? dialog.FileName : null;
    }
}

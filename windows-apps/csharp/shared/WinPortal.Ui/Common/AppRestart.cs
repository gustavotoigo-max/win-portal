using System.Diagnostics;
using System.Windows;

namespace WinPortal.Ui.Common;

/// <summary>Reabre o aplicativo (usado ao trocar o tema).</summary>
public static class AppRestart
{
    public static bool Restart()
    {
        var path = Environment.ProcessPath;
        if (path is null) return false;
        Process.Start(new ProcessStartInfo(path) { UseShellExecute = false, WorkingDirectory = AppContext.BaseDirectory });
        if (Application.Current?.MainWindow is Shell.ShellWindow shell) shell.CloseWithoutPrompt();
        Application.Current?.Shutdown();
        return true;
    }
}

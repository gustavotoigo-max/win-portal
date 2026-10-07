using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace WinPortal.Ui.Common;

/// <summary>Barra de título azul-marinho (Windows 11) e modo escuro (Windows 10).</summary>
public static class NativeWindow
{
    private const int DwmwaUseImmersiveDarkMode = 20;
    private const int DwmwaCaptionColor = 35;
    private const int DwmwaTextColor = 36;

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    public static void UseBrandTitleBar(Window window)
    {
        window.SourceInitialized += (_, _) =>
        {
            try
            {
                var hwnd = new WindowInteropHelper(window).Handle;
                var dark = 1;
                DwmSetWindowAttribute(hwnd, DwmwaUseImmersiveDarkMode, ref dark, sizeof(int));
                var caption = 0x0033170B; // #0B1733 em COLORREF (0x00BBGGRR)
                DwmSetWindowAttribute(hwnd, DwmwaCaptionColor, ref caption, sizeof(int));
                var text = 0x00FAF8F8;
                DwmSetWindowAttribute(hwnd, DwmwaTextColor, ref text, sizeof(int));
            }
            catch
            {
                // Versões antigas do Windows: mantém a barra padrão.
            }
        };
    }
}

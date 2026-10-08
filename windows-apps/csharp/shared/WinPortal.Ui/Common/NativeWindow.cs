using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Shell;

namespace WinPortal.Ui.Common;

/// <summary>
/// Janelas sem a barra de título do Windows: o cabeçalho do próprio app faz o papel
/// da barra (arrastar, duplo clique para maximizar, encaixe nas bordas, Win+Setas),
/// com os botões de CaptionButtons. Sombra e cantos arredondados continuam do Windows.
/// </summary>
public static class NativeWindow
{
    private const int DwmwaWindowCornerPreference = 33;
    private const int DwmwcpRound = 2;
    private const int SmCxFrame = 32;
    private const int SmCyFrame = 33;
    private const int SmCxPaddedBorder = 92;

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    [DllImport("user32.dll")]
    private static extern int GetSystemMetricsForDpi(int index, uint dpi);

    /// <summary>
    /// Tira a barra do Windows. <paramref name="captionHeight"/> é a altura, a partir
    /// do topo, da área que arrasta a janela; botões dentro dela precisam de
    /// WindowChrome.IsHitTestVisibleInChrome (CaptionButtons já faz isso).
    /// </summary>
    public static void UseBorderless(Window window, double captionHeight)
    {
        var resizable = window.ResizeMode is ResizeMode.CanResize or ResizeMode.CanResizeWithGrip;
        WindowChrome.SetWindowChrome(window, new WindowChrome
        {
            CaptionHeight = captionHeight,
            ResizeBorderThickness = resizable ? new Thickness(6) : new Thickness(0),
            // 1 px de vidro na base mantém a sombra do Windows na janela.
            GlassFrameThickness = new Thickness(0, 0, 0, 1),
            CornerRadius = new CornerRadius(0),
            UseAeroCaptionButtons = false,
        });

        window.SourceInitialized += (_, _) =>
        {
            try
            {
                var hwnd = new WindowInteropHelper(window).Handle;
                var corner = DwmwcpRound;
                DwmSetWindowAttribute(hwnd, DwmwaWindowCornerPreference, ref corner, sizeof(int));
            }
            catch
            {
                // Windows 10: cantos retos, como as demais janelas do sistema.
            }
        };

        // Maximizada, a janela passa da tela pela espessura da borda invisível;
        // a margem compensa para o cabeçalho e o rodapé não ficarem cortados.
        void FitMaximized() =>
            window.BorderThickness = window.WindowState == WindowState.Maximized ? MaximizedInset(window) : new Thickness(0);
        window.StateChanged += (_, _) => FitMaximized();
        window.Loaded += (_, _) => FitMaximized();
    }

    private static Thickness MaximizedInset(Window window)
    {
        try
        {
            var dpi = System.Windows.Media.VisualTreeHelper.GetDpi(window);
            var dpiValue = (uint)Math.Round(96 * dpi.DpiScaleX);
            var padded = GetSystemMetricsForDpi(SmCxPaddedBorder, dpiValue);
            var x = (GetSystemMetricsForDpi(SmCxFrame, dpiValue) + padded) / dpi.DpiScaleX;
            var y = (GetSystemMetricsForDpi(SmCyFrame, dpiValue) + padded) / dpi.DpiScaleY;
            if (x > 0 && y > 0) return new Thickness(x, y, x, y);
        }
        catch
        {
            // Sem a API por DPI: usa o valor do WPF abaixo.
        }
        return SystemParameters.WindowResizeBorderThickness;
    }
}

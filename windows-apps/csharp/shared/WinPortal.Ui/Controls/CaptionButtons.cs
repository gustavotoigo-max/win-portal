using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Shell;

namespace WinPortal.Ui.Controls;

/// <summary>
/// Botões de minimizar, maximizar e fechar desenhados pelo próprio app, para as
/// janelas sem a barra de título do Windows (ver NativeWindow.UseBorderless).
/// Fica no canto superior direito do cabeçalho.
/// </summary>
public class CaptionButtons : StackPanel
{
    private readonly Button _minimize = new() { Content = "", ToolTip = "Minimizar" };
    private readonly Button _maximize = new() { Content = "", ToolTip = "Maximizar" };
    private readonly Button _close = new() { Content = "", ToolTip = "Fechar" };
    private Window? _window;

    /// <summary>Usar as cores para fundo azul-marinho (cabeçalho) ou para fundo claro.</summary>
    public bool OnNavy { get; set; } = true;

    /// <summary>Janelas de diálogo mostram só o botão de fechar.</summary>
    public bool CloseOnly { get; set; }

    /// <summary>Altura dos botões; o padrão (32) segue o Windows.</summary>
    public double ButtonHeight { get; set; } = 32;

    public CaptionButtons()
    {
        Orientation = Orientation.Horizontal;
        HorizontalAlignment = HorizontalAlignment.Right;
        VerticalAlignment = VerticalAlignment.Top;
        WindowChrome.SetIsHitTestVisibleInChrome(this, true);
        AutomationProperties.SetName(_minimize, "Minimizar");
        AutomationProperties.SetName(_maximize, "Maximizar");
        AutomationProperties.SetName(_close, "Fechar");

        _minimize.Click += (_, _) => { if (_window is not null) _window.WindowState = WindowState.Minimized; };
        _maximize.Click += (_, _) => ToggleMaximize();
        _close.Click += (_, _) => _window?.Close();

        Loaded += (_, _) =>
        {
            if (_window is not null) return;
            _window = Window.GetWindow(this);
            if (_window is null) return;
            _window.StateChanged += (_, _) => UpdateMaximizeGlyph();
            UpdateMaximizeGlyph();
        };
    }

    protected override void OnInitialized(EventArgs e)
    {
        base.OnInitialized(e);
        var style = OnNavy ? "CaptionButtonOnNavy" : "CaptionButton";
        foreach (var button in new[] { _minimize, _maximize })
        {
            button.SetResourceReference(StyleProperty, style);
            button.Focusable = false;
            button.Height = ButtonHeight;
            if (!CloseOnly) Children.Add(button);
        }
        _close.SetResourceReference(StyleProperty, OnNavy ? "CaptionCloseButtonOnNavy" : "CaptionCloseButton");
        _close.Focusable = false;
        _close.Height = ButtonHeight;
        Children.Add(_close);
    }

    private void ToggleMaximize()
    {
        if (_window is null) return;
        _window.WindowState = _window.WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private void UpdateMaximizeGlyph()
    {
        var maximized = _window?.WindowState == WindowState.Maximized;
        _maximize.Content = maximized ? "" : "";
        _maximize.ToolTip = maximized ? "Restaurar" : "Maximizar";
        AutomationProperties.SetName(_maximize, (string)_maximize.ToolTip);
    }
}

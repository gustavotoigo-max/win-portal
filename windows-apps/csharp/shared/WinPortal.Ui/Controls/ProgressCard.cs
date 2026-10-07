using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace WinPortal.Ui.Controls;

/// <summary>Cartão de progresso padrão: barra e uma linha de estado com cor por situação.</summary>
public class ProgressCard : Border
{
    private readonly ProgressBar _bar = new();
    private readonly TextBlock _status = new() { Margin = new Thickness(0, 10, 0, 0) };

    public ProgressCard()
    {
        SetResourceReference(StyleProperty, "Card");
        Margin = new Thickness(0, 16, 0, 0);
        Padding = new Thickness(20, 16, 20, 16);
        _status.SetResourceReference(StyleProperty, "StatusText");
        var panel = new StackPanel();
        panel.Children.Add(_bar);
        panel.Children.Add(_status);
        Child = panel;
    }

    /// <summary>Texto inicial (antes da primeira execução).</summary>
    public string ReadyText
    {
        get => _status.Text;
        set => Ready(value);
    }

    public string Text => _status.Text;

    private void Set(string text, string brushKey)
    {
        _status.Text = text;
        _status.SetResourceReference(TextBlock.ForegroundProperty, brushKey);
    }

    public void Ready(string text)
    {
        _bar.IsIndeterminate = false;
        _bar.Value = 0;
        Set(text, "TextMutedBrush");
    }

    /// <summary>Em andamento. Sem fração, a barra fica em modo contínuo.</summary>
    public void Working(string text, double? fraction = null)
    {
        Set(text, "TextBrush");
        Report(fraction);
    }

    public void Report(double? fraction)
    {
        _bar.IsIndeterminate = fraction is null;
        if (fraction is { } value) _bar.Value = Math.Clamp(value, 0, 1);
    }

    public void Done(string text)
    {
        _bar.IsIndeterminate = false;
        _bar.Value = 1;
        Set(text, "SuccessBrush");
    }

    public void Warn(string text)
    {
        _bar.IsIndeterminate = false;
        _bar.Value = 1;
        Set(text, "WarningBrush");
    }

    public void Cancelled(string text)
    {
        _bar.IsIndeterminate = false;
        Set(text, "WarningBrush");
    }

    public void Failed(string text)
    {
        _bar.IsIndeterminate = false;
        Set(text, "DangerBrush");
    }
}

using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Ui.Controls;

/// <summary>
/// Barra de ações padrão, sempre na mesma posição: botão principal (com o verbo da
/// ferramenta), botões secundários declarados no XAML e, por último, "Cancelar".
/// </summary>
public class ActionBar : StackPanel
{
    private bool _busy;
    private bool _canStart = true;

    public ActionBar()
    {
        Orientation = Orientation.Horizontal;
        Margin = new Thickness(0, 4, 0, 0);
        LayoutUpdated += (_, _) => AlignWithFields();
        Primary.SetResourceReference(StyleProperty, "PrimaryButton");
        Cancel.SetResourceReference(StyleProperty, "DangerButton");
        Cancel.IsEnabled = false;
        Cancel.ToolTip = "Interrompe a operação depois da etapa atual.";
        Primary.Click += (s, e) => PrimaryClick?.Invoke(s, e);
        Cancel.Click += (s, e) =>
        {
            Cancel.IsEnabled = false;
            CancelClick?.Invoke(s, e);
        };
        Children.Add(Primary);
    }

    public Button Primary { get; } = new();
    public Button Cancel { get; } = new() { Content = "Cancelar" };

    public event RoutedEventHandler? PrimaryClick;
    public event RoutedEventHandler? CancelClick;

    public string PrimaryText
    {
        get => Primary.Content as string ?? "";
        set => Primary.Content = value;
    }

    /// <summary>Habilita o botão principal quando a ferramenta está parada.</summary>
    public bool CanStart
    {
        get => _canStart;
        set
        {
            _canStart = value;
            Refresh();
        }
    }

    public bool IsBusy
    {
        get => _busy;
        set
        {
            _busy = value;
            Refresh();
        }
    }

    public override void EndInit()
    {
        base.EndInit();
        if (!Children.Contains(Cancel)) Children.Add(Cancel);
        for (var i = 1; i < Children.Count; i++)
            if (Children[i] is FrameworkElement element) element.Margin = new Thickness(10, 0, 0, 0);
    }

    /// <summary>
    /// Alinha o botão principal com o início dos campos: a coluna de rótulos tem a
    /// largura do rótulo mais longo da tela, então a margem acompanha essa largura.
    /// </summary>
    private void AlignWithFields()
    {
        if (Parent is not Panel panel) return;
        var field = panel.Children.OfType<Grid>().FirstOrDefault(g => g is PathField or FormRow);
        if (field is null || field.ColumnDefinitions.Count == 0) return;
        var left = field.ColumnDefinitions[0].ActualWidth;
        if (Math.Abs(Margin.Left - left) > 0.5) Margin = new Thickness(left, Margin.Top, Margin.Right, Margin.Bottom);
    }

    private void Refresh()
    {
        Primary.IsEnabled = !_busy && _canStart;
        Cancel.IsEnabled = _busy;
        foreach (var child in Children)
            if (child is UIElement element && element != Primary && element != Cancel) element.IsEnabled = !_busy;
    }
}

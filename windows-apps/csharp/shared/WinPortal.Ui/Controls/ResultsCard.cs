using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;

namespace WinPortal.Ui.Controls;

/// <summary>
/// Cartão de resultados padrão: título, resumo e as ações "Exportar relatório" e
/// "Limpar" no cabeçalho, sempre no mesmo lugar.
/// </summary>
[ContentProperty(nameof(Body))]
public class ResultsCard : Border
{
    private readonly Grid _grid = new();
    private readonly TextBlock _title = new() { Text = "RESULTADOS", Margin = new Thickness(0) };
    private readonly TextBlock _summary = new() { FontSize = 12, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 16, 0) };
    private readonly TextBlock _placeholder = new()
    {
        VerticalAlignment = VerticalAlignment.Center,
        HorizontalAlignment = HorizontalAlignment.Center,
        TextAlignment = TextAlignment.Center,
    };
    private UIElement? _body;

    public ResultsCard()
    {
        SetResourceReference(StyleProperty, "Card");
        Margin = new Thickness(0, 16, 0, 0);
        Padding = new Thickness(20, 16, 20, 16);

        _grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        _grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

        _title.SetResourceReference(StyleProperty, "SectionLabelText");
        _title.Margin = new Thickness(0);
        _title.VerticalAlignment = VerticalAlignment.Center;
        _summary.SetResourceReference(TextBlock.ForegroundProperty, "TextMutedBrush");
        ExportButton.SetResourceReference(StyleProperty, "LinkButton");
        ClearButton.SetResourceReference(StyleProperty, "LinkButton");
        ExportButton.Click += (s, e) => ExportClick?.Invoke(s, e);
        ClearButton.Click += (s, e) => ClearClick?.Invoke(s, e);

        var actions = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
        actions.Children.Add(_summary);
        actions.Children.Add(ExportButton);
        var dot = new TextBlock { Text = "·", Margin = new Thickness(10, 0, 10, 0), VerticalAlignment = VerticalAlignment.Center };
        dot.SetResourceReference(TextBlock.ForegroundProperty, "TextSubtleBrush");
        actions.Children.Add(dot);
        actions.Children.Add(ClearButton);

        var header = new DockPanel { Margin = new Thickness(0, 0, 0, 8), LastChildFill = true };
        DockPanel.SetDock(actions, Dock.Right);
        header.Children.Add(actions);
        header.Children.Add(_title);
        _grid.Children.Add(header);

        _placeholder.SetResourceReference(StyleProperty, "StatusText");
        _placeholder.SetResourceReference(TextBlock.ForegroundProperty, "TextSubtleBrush");
        _placeholder.Visibility = Visibility.Collapsed;
        Grid.SetRow(_placeholder, 1);
        _grid.Children.Add(_placeholder);
        Child = _grid;
    }

    public Button ExportButton { get; } = new() { Content = "Exportar relatório", ToolTip = "Salvar os resultados em um arquivo" };
    public Button ClearButton { get; } = new() { Content = "Limpar", ToolTip = "Limpar os resultados exibidos" };

    public event RoutedEventHandler? ExportClick;
    public event RoutedEventHandler? ClearClick;

    public string Title
    {
        get => _title.Text;
        set => _title.Text = value;
    }

    /// <summary>Resumo curto exibido no cabeçalho (ex.: "12 arquivo(s)").</summary>
    public string Summary
    {
        get => _summary.Text;
        set => _summary.Text = value;
    }

    /// <summary>Texto exibido enquanto não há resultados.</summary>
    public string Placeholder
    {
        get => _placeholder.Text;
        set => _placeholder.Text = value;
    }

    public UIElement? Body
    {
        get => _body;
        set
        {
            if (_body is not null) _grid.Children.Remove(_body);
            _body = value;
            if (value is null) return;
            Grid.SetRow(value, 1);
            _grid.Children.Insert(1, value);
        }
    }

    /// <summary>Mostra o texto de espera no lugar do conteúdo.</summary>
    public void ShowPlaceholder(bool show)
    {
        _placeholder.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
        if (_body is not null) _body.Visibility = show ? Visibility.Hidden : Visibility.Visible;
    }

    /// <summary>Durante uma execução não se limpa nem se exporta.</summary>
    public void SetBusy(bool busy)
    {
        ExportButton.IsEnabled = !busy;
        ClearButton.IsEnabled = !busy;
    }
}

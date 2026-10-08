using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;

namespace WinPortal.Ui.Controls;

/// <summary>Linha de formulário alinhada com os campos de caminho: rótulo à esquerda e conteúdo.</summary>
[ContentProperty(nameof(Field))]
public class FormRow : Grid
{
    private readonly TextBlock _label = new();
    private UIElement? _field;

    public FormRow()
    {
        Margin = new Thickness(0, 0, 0, 12);
        ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto, SharedSizeGroup = PathField.LabelColumnGroup });
        ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        _label.SetResourceReference(StyleProperty, "FieldLabelText");
        _label.Margin = PathField.LabelMargin;
        Children.Add(_label);
    }

    public string Label
    {
        get => _label.Text;
        set => _label.Text = value;
    }

    public UIElement? Field
    {
        get => _field;
        set
        {
            if (_field is not null) Children.Remove(_field);
            _field = value;
            if (value is null) return;
            SetColumn(value, 1);
            Children.Add(value);
        }
    }
}

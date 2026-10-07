using System.ComponentModel;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using WinPortal.Ui.Common;
using WinPortal.Ui.Controls;

namespace WinPortal.Ui.Tools;

/// <summary>Item da navegação da Solução Completa.</summary>
public sealed class SuiteItem(ToolDescriptor descriptor, ImageSource? icon) : INotifyPropertyChanged
{
    private bool _busy;

    public ToolDescriptor Descriptor { get; } = descriptor;
    public string Name => Descriptor.Name;
    public string Summary => Descriptor.Summary;
    public string Category => Descriptor.Category;
    public ImageSource? Icon { get; } = icon;

    /// <summary>A tela é criada na primeira vez que a ferramenta é aberta e mantida depois.</summary>
    public FrameworkElement? View { get; set; }

    public bool IsBusy
    {
        get => _busy;
        set
        {
            if (_busy == value) return;
            _busy = value;
            Notify();
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    private void Notify([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

/// <summary>
/// Solução Completa: todas as ferramentas numa só janela, com navegação lateral.
/// Cada ferramenta mantém seu estado ao trocar de tela e pode continuar rodando
/// enquanto outra é usada.
/// </summary>
public partial class ToolSuiteView : UserControl, IToolView
{
    private readonly List<SuiteItem> _items;
    private readonly string? _settingsKey;

    public ToolSuiteView(IEnumerable<ToolDescriptor> tools, string? settingsKey = null)
    {
        InitializeComponent();
        _settingsKey = settingsKey;
        _items = tools
            .OrderBy(t => Array.IndexOf(ToolCategories.Order, t.Category) is var i && i < 0 ? int.MaxValue : i)
            .Select(t => new SuiteItem(t, LoadIcon(t.Id)))
            .ToList();

        var view = new ListCollectionView(_items);
        view.GroupDescriptions.Add(new PropertyGroupDescription(nameof(SuiteItem.Category)));
        Nav.ItemsSource = view;

        var last = ToolSettings.LastTool(_settingsKey);
        Nav.SelectedItem = _items.FirstOrDefault(i => i.Descriptor.Id == last) ?? _items.FirstOrDefault();
    }

    public bool IsBusy => _items.Any(i => i.IsBusy);
    public event EventHandler? BusyChanged;

    public void RequestCancel()
    {
        foreach (var item in _items)
            if (item.View is IToolView tool && tool.IsBusy) tool.RequestCancel();
    }

    private static ImageSource? LoadIcon(string id)
    {
        try
        {
            var assembly = (Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly()).GetName().Name;
            var image = new BitmapImage();
            image.BeginInit();
            image.UriSource = new Uri($"pack://application:,,,/{assembly};component/Assets/Tools/{id}.png");
            image.DecodePixelWidth = 64;
            image.CacheOption = BitmapCacheOption.OnLoad;
            image.EndInit();
            image.Freeze();
            return image;
        }
        catch
        {
            return null;
        }
    }

    private void OnSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (Nav.SelectedItem is not SuiteItem item) return;
        if (item.View is null)
        {
            item.View = item.Descriptor.Create();
            if (item.View is IToolView tool)
                tool.BusyChanged += (_, _) =>
                {
                    item.IsBusy = tool.IsBusy;
                    BusyChanged?.Invoke(this, EventArgs.Empty);
                };
        }
        Host.Content = item.View;
        ToolSettings.RememberTool(_settingsKey, item.Descriptor.Id);
    }
}

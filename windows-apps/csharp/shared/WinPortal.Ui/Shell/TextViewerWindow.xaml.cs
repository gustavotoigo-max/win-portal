using System.Windows;
using WinPortal.Ui.Common;

namespace WinPortal.Ui.Shell;

/// <summary>Janela de detalhes com texto longo (somente leitura).</summary>
public partial class TextViewerWindow : Window
{
    public TextViewerWindow(Window? owner, string title, string content)
    {
        InitializeComponent();
        NativeWindow.UseBrandTitleBar(this);
        Title = title;
        HeaderText.Text = title;
        Body.Text = content;
        if (owner is not null) Owner = owner;
        else WindowStartupLocation = WindowStartupLocation.CenterScreen;
        if (owner?.Icon is not null) Icon = owner.Icon;
    }

    private void OnCopy(object sender, RoutedEventArgs e)
    {
        try { Clipboard.SetText(Body.Text); } catch { }
    }

    private void OnClose(object sender, RoutedEventArgs e) => Close();
}

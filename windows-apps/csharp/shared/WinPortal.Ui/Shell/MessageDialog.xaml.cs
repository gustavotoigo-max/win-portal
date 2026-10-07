using System.Windows;
using System.Windows.Media;
using WinPortal.Ui.Common;

namespace WinPortal.Ui.Shell;

public enum DialogKind { Info, Success, Warning, Error, Question }

/// <summary>Caixa de mensagem com a identidade visual (substitui o MessageBox padrão).</summary>
public partial class MessageDialog : Window
{
    private MessageDialog(string title, string message, DialogKind kind, string okText, string? cancelText)
    {
        InitializeComponent();
        NativeWindow.UseBrandTitleBar(this);
        Title = title;
        TitleText.Text = title;
        MessageText.Text = message;
        OkButton.Content = okText;
        if (cancelText is not null)
        {
            CancelButton.Content = cancelText;
            CancelButton.Visibility = Visibility.Visible;
        }

        var (glyph, foreground, background) = kind switch
        {
            DialogKind.Success => ("", "SuccessBrush", "SuccessSoftBrush"),
            DialogKind.Warning => ("", "WarningBrush", "WarningSoftBrush"),
            DialogKind.Error => ("", "DangerBrush", "DangerSoftBrush"),
            DialogKind.Question => ("", "BlueBrush", "BlueSoftBrush"),
            _ => ("", "BlueBrush", "BlueSoftBrush"),
        };
        IconGlyph.Text = glyph;
        IconGlyph.Foreground = (Brush)FindResource(foreground);
        IconCircle.Background = (Brush)FindResource(background);
        if (kind == DialogKind.Error) OkButton.Style = (Style)FindResource("PrimaryButton");
    }

    private void OnOk(object sender, RoutedEventArgs e) => DialogResult = true;
    private void OnCancel(object sender, RoutedEventArgs e) => DialogResult = false;

    private static bool Show(DependencyObject? owner, string title, string message, DialogKind kind,
        string okText = "OK", string? cancelText = null)
    {
        var dialog = new MessageDialog(title, message, kind, okText, cancelText);
        var ownerWindow = owner as Window ?? (owner is not null ? Window.GetWindow(owner) : null) ?? Application.Current?.MainWindow;
        if (ownerWindow is not null && ownerWindow.IsVisible && !ReferenceEquals(ownerWindow, dialog))
            dialog.Owner = ownerWindow;
        else
            dialog.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        return dialog.ShowDialog() == true;
    }

    public static void Info(DependencyObject? owner, string title, string message) => Show(owner, title, message, DialogKind.Info);
    public static void Success(DependencyObject? owner, string title, string message) => Show(owner, title, message, DialogKind.Success);
    public static void Warning(DependencyObject? owner, string title, string message) => Show(owner, title, message, DialogKind.Warning);
    public static void Error(DependencyObject? owner, string title, string message) => Show(owner, title, message, DialogKind.Error);

    public static bool Confirm(DependencyObject? owner, string title, string message, string yes = "Sim", string no = "Não",
        bool destructive = false)
    {
        var dialog = new MessageDialog(title, message, destructive ? DialogKind.Warning : DialogKind.Question, yes, no);
        if (destructive) dialog.OkButton.Style = (Style)dialog.FindResource("DangerSolidButton");
        var ownerWindow = owner as Window ?? (owner is not null ? Window.GetWindow(owner) : null) ?? Application.Current?.MainWindow;
        if (ownerWindow is not null && ownerWindow.IsVisible) dialog.Owner = ownerWindow;
        else dialog.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        return dialog.ShowDialog() == true;
    }
}

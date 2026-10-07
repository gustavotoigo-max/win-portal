using System.Windows;
using System.Windows.Controls;
using WinPortal.Ui.Common;
using WinPortal.Ui.Updates;

namespace WinPortal.Ui.Shell;

/// <summary>Configurações comuns a todos os aplicativos: tema e atualizações.</summary>
public partial class SettingsWindow : Window
{
    private readonly ShellWindow _shell;
    private readonly bool _loading;

    public SettingsWindow(ShellWindow shell, ProductInfo product)
    {
        InitializeComponent();
        NativeWindow.UseBrandTitleBar(this);
        Owner = shell;
        _shell = shell;
        _loading = true;
        VersionText.Text = $"{product.AppName} · versão {UpdateService.CurrentVersion.ToString(3)}";
        AutoUpdateCheck.IsChecked = UpdateService.AutoCheck;
        _loading = false;
        ShowTheme(ThemeManager.Mode);
    }

    private void ShowTheme(ThemeMode mode)
    {
        foreach (var button in new[] { AutoButton, LightButton, DarkButton })
        {
            var selected = (string)button.Tag == mode.ToString();
            button.SetResourceReference(StyleProperty, selected ? "PrimaryButton" : "SecondaryButton");
        }
        ThemeHint.Text = mode == ThemeMode.Auto
            ? $"Segue o tema do Windows (agora: {(ThemeManager.WindowsPrefersDark() ? "escuro" : "claro")})."
            : "O mesmo tema vale para todos os aplicativos Nexotool deste computador.";
    }

    private void OnTheme(object sender, RoutedEventArgs e)
    {
        var mode = Enum.Parse<ThemeMode>((string)((Button)sender).Tag);
        if (mode == ThemeManager.Mode) return;
        ThemeManager.Mode = mode;
        ShowTheme(mode);

        if (ThemeManager.ResolveDark(mode) == ThemeManager.IsDark) return;
        if (_shell.ToolIsBusy)
        {
            MessageDialog.Info(this, "Tema", "O novo tema será aplicado na próxima vez que o aplicativo for aberto.");
            return;
        }
        if (MessageDialog.Confirm(this, "Aplicar o tema",
                "Para trocar o tema, o aplicativo precisa ser reaberto.\n\nDeseja reabrir agora?",
                yes: "Reabrir agora", no: "Depois"))
            AppRestart.Restart();
    }

    private void OnAutoUpdateChanged(object sender, RoutedEventArgs e)
    {
        if (!_loading) UpdateService.AutoCheck = AutoUpdateCheck.IsChecked == true;
    }

    private async void OnCheckNow(object sender, RoutedEventArgs e)
    {
        CheckButton.IsEnabled = false;
        InstallButton.Visibility = Visibility.Collapsed;
        UpdateStatus.Text = "Procurando atualizações...";
        UpdateStatus.SetResourceReference(TextBlock.ForegroundProperty, "TextMutedBrush");
        try
        {
            var update = await _shell.CheckForUpdatesAsync(manual: true);
            if (update is null)
            {
                UpdateStatus.Text = "Você já está usando a versão mais recente.";
                UpdateStatus.SetResourceReference(TextBlock.ForegroundProperty, "SuccessBrush");
            }
            else
            {
                UpdateStatus.Text = $"Versão {update.Version.ToString(3)} disponível.";
                UpdateStatus.SetResourceReference(TextBlock.ForegroundProperty, "BlueBrush");
                InstallButton.Visibility = Visibility.Visible;
            }
        }
        catch (Exception ex)
        {
            UpdateStatus.Text = $"Não foi possível procurar atualizações agora. {UpdateService.Describe(ex)}";
            UpdateStatus.SetResourceReference(TextBlock.ForegroundProperty, "DangerBrush");
        }
        finally
        {
            CheckButton.IsEnabled = true;
        }
    }

    private async void OnInstall(object sender, RoutedEventArgs e)
    {
        Close();
        await _shell.StartUpdateAsync();
    }

    private void OnClose(object sender, RoutedEventArgs e) => Close();
}

using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Media;
using WinPortal.Licensing;
using WinPortal.Ui.Common;

namespace WinPortal.Ui.Shell;

/// <summary>
/// Janela principal comum a todos os aplicativos (equivalente a ui/application.py):
/// verifica a licença ao abrir, libera a ferramenta e revalida em segundo plano.
/// </summary>
public partial class ShellWindow : Window
{
    private readonly ProductInfo _product;
    private readonly Func<FrameworkElement> _createTool;
    private FrameworkElement? _tool;
    private ActivationWindow? _activationWindow;

    public JsonObject? LicensePayload { get; private set; }
    public string? ActivationMode { get; private set; }

    public ShellWindow(ProductInfo product, Func<FrameworkElement> createTool)
    {
        InitializeComponent();
        NativeWindow.UseBrandTitleBar(this);
        _product = product;
        _createTool = createTool;

        Title = product.AppName;
        Width = product.WindowWidth;
        Height = product.WindowHeight;
        MinWidth = product.WindowMinWidth;
        MinHeight = product.WindowMinHeight;
        var icon = product.LoadIcon();
        if (icon is not null) Icon = icon;
        var logo = product.LoadLogo();
        LogoImage.Source = logo;
        LockedLogo.Source = logo;
        AppNameText.Text = product.AppName;
        TaglineText.Text = product.Tagline;
        FooterText.Text = $"WinPortal · {product.AppName} {product.Version}";

        ShowLocked("Verificando ativação...", "Aguarde um instante.", showActions: false);
        SetLicenseBadge("Verificando...", "TextOnNavyMutedBrush");
        Loaded += async (_, _) =>
        {
            await Task.Delay(100);
            await RunInitialCheckAsync();
        };
    }

    private void SetLicenseBadge(string text, string brushKey)
    {
        LicenseText.Text = text;
        LicenseDot.Fill = (Brush)FindResource(brushKey);
    }

    private void ShowLocked(string title, string message, bool showActions = true)
    {
        ToolHost.Content = null;
        _tool = null;
        LockedPanel.Visibility = Visibility.Visible;
        LockedTitle.Text = title;
        LockedMessage.Text = message;
        LockedActions.Visibility = showActions ? Visibility.Visible : Visibility.Collapsed;
    }

    private async Task RunInitialCheckAsync()
    {
        var result = await Task.Run(() => new LicenseVerifier(_product.Identity).VerifyLocalLicense());
        if (result.Ok)
        {
            LicensePayload = result.LicensePayload;
            ActivationMode = "offline";
            UnlockTool();
            _ = RevalidateLaterAsync();
            return;
        }

        LicensePayload = null;
        ActivationMode = null;
        ShowLocked("Software não ativado",
            $"Ative o {_product.AppName} com o e-mail da compra e a chave da licença para começar a usar.");
        SetLicenseBadge("Ativar licença", "CyanBrush");
        await Task.Delay(150);
        OpenActivation();
    }

    private void UnlockTool()
    {
        SetLicenseBadge("Licença ativa", "SuccessBrush");
        if (_tool is not null) return;
        LockedPanel.Visibility = Visibility.Collapsed;
        _tool = _createTool();
        ToolHost.Content = _tool;
    }

    public void OpenActivation()
    {
        if (_activationWindow is not null)
        {
            _activationWindow.Activate();
            return;
        }

        bool ok;
        ActivationResult? result;
        try
        {
            _activationWindow = new ActivationWindow(this, _product, LicensePayload, ActivationMode);
            ok = _activationWindow.ShowDialog() == true;
            result = _activationWindow.Result;
        }
        catch (Exception ex)
        {
            MessageDialog.Error(this, "Ativação", $"Não foi possível abrir a ativação: {ex.Message}");
            return;
        }
        finally
        {
            _activationWindow = null;
        }
        if (ok && result is not null) ActivationSucceeded(result);
    }

    private void ActivationSucceeded(ActivationResult result)
    {
        if (result.Verification is not null)
            LicensePayload = result.Verification.LicensePayload;
        else
            LicensePayload = (result.Response as JsonObject)?.GetObject("license");
        ActivationMode = "online";
        UnlockTool();
        MessageDialog.Success(this, "Ativação", "Software ativado com sucesso.");
        _ = RevalidateLaterAsync();
    }

    private async Task RevalidateLaterAsync()
    {
        await Task.Delay(500);
        RevalidationResult result;
        try
        {
            result = await Task.Run(() => new RevalidationService(_product.Identity).RevalidateIfNeeded(force: false));
        }
        catch (Exception ex)
        {
            result = new RevalidationResult(false, "UNEXPECTED", ex.Message);
        }

        if (result.Ok)
        {
            if (result.Verification is not null) LicensePayload = result.Verification.LicensePayload;
            if (result.Revalidated) ActivationMode = "online";
            return;
        }

        LicensePayload = null;
        ActivationMode = null;
        ShowLocked("Licença indisponível", result.Message);
        SetLicenseBadge("Licença indisponível", "DangerBrush");
        MessageDialog.Error(this, "Licença", result.Message);
    }

    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        base.OnClosing(e);
        if (e.Cancel || _tool is not Controls.IToolView { IsBusy: true } busyTool) return;
        if (!MessageDialog.Confirm(this, "Operação em andamento",
                "Uma operação ainda está em andamento.\n\nDeseja interromper e fechar o aplicativo?",
                yes: "Interromper e fechar", no: "Continuar", destructive: true))
        {
            e.Cancel = true;
            return;
        }
        busyTool.RequestCancel();
    }

    private void OnLicenseClick(object sender, RoutedEventArgs e) => OpenActivation();
    private void OnBuyClick(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.ProductUrl(_product.Identity.ProductId));
    private void OnAccountClick(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.AccountUrl);
    private void OnSiteClick(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.LicenseServerBaseUrl);
}

using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Media;
using WinPortal.Licensing;
using System.Windows.Threading;
using WinPortal.Ui.Common;
using WinPortal.Ui.Updates;

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
    private readonly DispatcherTimer _updateTimer = new() { Interval = UpdateService.CheckInterval };
    private UpdateInfo? _update;
    private Version? _dismissedVersion;
    private CancellationTokenSource? _downloadCts;
    private bool _closeWithoutPrompt;

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
        FooterText.Text = $"{Brand.Name} · {product.AppName} {product.Version}";

        ShowLocked("Verificando ativação...", "Aguarde um instante.", showActions: false);
        SetLicenseBadge("Verificando...", "TextOnNavyMutedBrush");
        Loaded += async (_, _) =>
        {
            await Task.Delay(100);
            await RunInitialCheckAsync();
            await Task.Delay(TimeSpan.FromSeconds(8));
            if (UpdateService.AutoCheck) await CheckForUpdatesAsync(manual: false);
        };
        _updateTimer.Tick += async (_, _) =>
        {
            if (UpdateService.AutoCheck) await CheckForUpdatesAsync(manual: false);
        };
        _updateTimer.Start();
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

    /// <summary>Fecha sem perguntar (atualização ou troca de tema já confirmadas).</summary>
    public void CloseWithoutPrompt() => _closeWithoutPrompt = true;

    /// <summary>Há uma ferramenta em execução?</summary>
    public bool ToolIsBusy => _tool is Controls.IToolView { IsBusy: true };

    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        base.OnClosing(e);
        if (_closeWithoutPrompt) return;
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

    private void OnSettingsClick(object sender, RoutedEventArgs e) => new SettingsWindow(this, _product).ShowDialog();

    // ============================== Atualizações ==============================

    /// <summary>
    /// Procura versão nova. Na verificação automática, falhas são silenciosas; na
    /// manual (Configurações), o resultado é sempre mostrado.
    /// </summary>
    public async Task<UpdateInfo?> CheckForUpdatesAsync(bool manual)
    {
        try
        {
            var update = await UpdateService.CheckAsync(_product.Identity.ExecutableName);
            _update = update;
            if (update is not null && (manual || update.Version != _dismissedVersion)) ShowUpdateBanner(update);
            return update;
        }
        catch (Exception ex) when (!manual)
        {
            Diagnostics.LogStep($"Verificação de atualização falhou: {ex.Message}");
            return null;
        }
    }

    private void ShowUpdateBanner(UpdateInfo update)
    {
        UpdateTitle.Text = $"Nova versão disponível: {_product.AppName} {update.Version.ToString(3)}";
        UpdateDetail.Text = $"Você está usando a versão {UpdateService.CurrentVersion.ToString(3)}. A atualização é baixada e instalada por aqui, e o aplicativo é reaberto no final.";
        UpdateProgress.Visibility = Visibility.Collapsed;
        UpdateNowButton.IsEnabled = UpdateLaterButton.IsEnabled = true;
        UpdateNowButton.Content = "Atualizar agora";
        UpdateLaterButton.Content = "Depois";
        UpdateNotesButton.Visibility = update.NotesUrl is null ? Visibility.Collapsed : Visibility.Visible;
        UpdateBanner.Visibility = Visibility.Visible;
    }

    private void OnUpdateNotes(object sender, RoutedEventArgs e)
    {
        if (_update?.NotesUrl is { } url) Browser.Open(url);
    }

    private void OnUpdateLater(object sender, RoutedEventArgs e)
    {
        if (_downloadCts is not null)
        {
            _downloadCts.Cancel();
            return;
        }
        _dismissedVersion = _update?.Version;
        UpdateBanner.Visibility = Visibility.Collapsed;
    }

    private async void OnUpdateNow(object sender, RoutedEventArgs e) => await StartUpdateAsync();

    /// <summary>Baixa, confere e aplica a versão nova (também chamado pelas Configurações).</summary>
    public async Task StartUpdateAsync()
    {
        if (_update is not { } update || _downloadCts is not null) return;
        if (ToolIsBusy && !MessageDialog.Confirm(this, "Operação em andamento",
                "Uma operação ainda está em andamento e será interrompida para atualizar.\n\nDeseja continuar?",
                yes: "Interromper e atualizar", no: "Agora não", destructive: true))
            return;

        ShowUpdateBanner(update);
        UpdateNowButton.IsEnabled = false;
        UpdateLaterButton.Content = "Cancelar";
        UpdateProgress.Visibility = Visibility.Visible;
        UpdateProgress.Value = 0;
        UpdateDetail.Text = "Baixando a atualização...";
        _downloadCts = new CancellationTokenSource();

        string file;
        try
        {
            var progress = new Progress<double>(value =>
            {
                UpdateProgress.Value = value;
                UpdateDetail.Text = $"Baixando a atualização... {value:P0}";
            });
            file = await UpdateService.DownloadAsync(update, _product.Identity.ExecutableName, progress, _downloadCts.Token);
        }
        catch (OperationCanceledException)
        {
            ShowUpdateBanner(update);
            return;
        }
        catch (Exception ex)
        {
            ShowUpdateBanner(update);
            MessageDialog.Error(this, "Atualização", $"Não foi possível baixar a atualização.\n{UpdateService.Describe(ex)}");
            return;
        }
        finally
        {
            _downloadCts?.Dispose();
            _downloadCts = null;
        }

        UpdateDetail.Text = UpdateService.IsInstalled
            ? "Instalando... confirme a permissão do Windows se ela aparecer."
            : "Aplicando a atualização...";
        UpdateLaterButton.IsEnabled = false;
        try
        {
            if (_tool is Controls.IToolView tool && tool.IsBusy) tool.RequestCancel();
            if (UpdateService.Apply(file))
            {
                CloseWithoutPrompt();
                Application.Current.Shutdown();
                return;
            }
            MessageDialog.Info(this, "Atualização", "A atualização não foi instalada porque a permissão do Windows foi recusada.");
        }
        catch (Exception ex)
        {
            MessageDialog.Error(this, "Atualização",
                $"Não foi possível aplicar a atualização:\n{ex.Message}\n\nVocê pode baixar a versão nova em Minhas licenças, no site.");
        }
        ShowUpdateBanner(update);
    }

    private void OnLicenseClick(object sender, RoutedEventArgs e) => OpenActivation();
    private void OnBuyClick(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.ProductUrl(_product.Identity.ProductId));
    private void OnAccountClick(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.AccountUrl);
    private void OnSiteClick(object sender, RoutedEventArgs e) => Browser.Open(Brand.SiteUrl);
}

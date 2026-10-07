using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Media;
using WinPortal.Licensing;
using WinPortal.Ui.Common;

namespace WinPortal.Ui.Shell;

/// <summary>Janela de ativação (e-mail e chave), equivalente a ui/activation_dialog.py.</summary>
public partial class ActivationWindow : Window
{
    private readonly ProductInfo _product;
    private readonly ActivationService _service;
    private readonly LicenseDetails _details;
    private bool _activateMode;
    private bool _busy;

    /// <summary>Resultado da ativação concluída com sucesso, se houver.</summary>
    public ActivationResult? Result { get; private set; }

    public ActivationWindow(Window owner, ProductInfo product, JsonObject? licensePayload, string? activationMode)
    {
        InitializeComponent();
        NativeWindow.UseBrandTitleBar(this);
        Owner = owner;
        Icon = owner.Icon;
        _product = product;
        _service = new ActivationService(product.Identity);
        _details = LicenseDetails.Build(licensePayload, activationMode);

        LogoImage.Source = product.LoadLogo();
        Title = $"Ativação · {product.AppName}";
        EmailBox.Text = _details.Email;

        if (_details.Active)
        {
            HeaderTitle.Text = "Dados da ativação";
            HeaderSubtitle.Text = $"{product.AppName} está ativado neste computador.";
            KeyBox.Text = _details.MaskedKey;
            EmailBox.IsEnabled = false;
            KeyBox.IsEnabled = false;
            KeyHint.Visibility = Visibility.Collapsed;
            ActiveInfo.Visibility = Visibility.Visible;
            StateText.Text = _details.State;
            ExpirationText.Text = _details.Expiration;
            ChangeButton.Visibility = Visibility.Visible;
            MainButton.Content = "Fechar";
            BuyLink.Visibility = Visibility.Collapsed;
        }
        else
        {
            HeaderTitle.Text = $"Ativar {product.AppName}";
            HeaderSubtitle.Text = "Informe o e-mail da compra e a chave da licença.";
            _activateMode = true;
            Loaded += (_, _) => (EmailBox.Text.Length == 0 ? EmailBox : KeyBox).Focus();
        }

        Closing += (_, e) => e.Cancel = _busy;
    }

    private void SetStatus(string text, string brushKey = "TextMutedBrush")
    {
        StatusText.Text = text;
        StatusText.Foreground = (Brush)FindResource(brushKey);
    }

    private void OnChange(object sender, RoutedEventArgs e)
    {
        EmailBox.IsEnabled = true;
        KeyBox.IsEnabled = true;
        KeyBox.Clear();
        KeyBox.Focus();
        KeyHint.Visibility = Visibility.Visible;
        ChangeButton.Visibility = Visibility.Collapsed;
        MainButton.Content = "Ativar";
        _activateMode = true;
        SetStatus("Informe uma nova chave somente se desejar alterar a ativação.");
    }

    private async void OnMain(object sender, RoutedEventArgs e)
    {
        if (!_activateMode)
        {
            Close();
            return;
        }

        var email = EmailBox.Text.Trim();
        var key = KeyBox.Text.Trim();
        if (key.Length == 0 || key == _details.MaskedKey)
        {
            SetStatus("Informe uma nova chave para alterar a ativação.", "DangerBrush");
            return;
        }

        _busy = true;
        MainButton.IsEnabled = false;
        ChangeButton.IsEnabled = false;
        EmailBox.IsEnabled = false;
        KeyBox.IsEnabled = false;
        MainButton.Content = "Ativando...";
        SetStatus("Validando licença...");

        ActivationResult result;
        try
        {
            result = await Task.Run(() => _service.ActivateAndSave(email, key));
        }
        catch (Exception ex)
        {
            result = new ActivationResult(false, "UNEXPECTED", $"Falha inesperada na ativação: {ex.Message}");
        }

        _busy = false;
        MainButton.IsEnabled = true;
        EmailBox.IsEnabled = true;
        KeyBox.IsEnabled = true;
        MainButton.Content = "Ativar";

        if (!result.Ok)
        {
            SetStatus(result.Message, "DangerBrush");
            return;
        }

        Result = result;
        DialogResult = true;
    }

    private void OnBuy(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.ProductUrl(_product.Identity.ProductId));
    private void OnAccount(object sender, RoutedEventArgs e) => Browser.Open(LicensingConfig.AccountUrl);
}

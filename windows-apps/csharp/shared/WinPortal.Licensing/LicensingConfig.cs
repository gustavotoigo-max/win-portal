namespace WinPortal.Licensing;

/// <summary>
/// Constantes do contrato de ativação com o portal (docs/CONTRATO-ATIVACAO.md).
/// Os valores são idênticos aos da versão Python (activation/config.py) e não
/// podem mudar sem atualizar o servidor.
/// </summary>
public static class LicensingConfig
{
    // O servidor usa este identificador; preservado para manter compatibilidade
    // com o endpoint e com as licenças assinadas existentes.
    public const string AppId = "com.winportal.windowssoftware";
    public const string ProtocolVersion = "activation-v1";

    public const string LicenseServerBaseUrl = "https://win-portal.vercel.app";
    public const string ActivationEndpoint = "/api/ativar";
    public const string RevalidationEndpoint = "/api/revalidar";
    public const int RequestTimeoutSeconds = 15;
    public const int RevalidationIntervalDays = 7;
    public const int OfflineMaxDays = 30;

    /// <summary>Páginas do portal abertas a partir dos aplicativos.</summary>
    public const string AccountUrl = LicenseServerBaseUrl + "/pt/dashboard";
    public static string ProductUrl(string productId) => $"{LicenseServerBaseUrl}/pt/solucoes/{productId}";

    private static readonly Lazy<string> PublicKey = new(() =>
    {
        using var stream = typeof(LicensingConfig).Assembly
            .GetManifestResourceStream("WinPortal.Licensing.ed25519_public_key.local")
            ?? throw new InvalidOperationException("Chave pública Ed25519 não encontrada.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd().Trim();
    });

    /// <summary>Mesma chave do arquivo activation/ed25519_public_key.local.</summary>
    public static string Ed25519PublicKeyBase64 => PublicKey.Value;
}

/// <summary>Identidade do produto (equivalente ao project_config.py de cada app).</summary>
public sealed record ProductIdentity(
    string AppName,
    string AppSlug,
    string ExecutableName,
    string Software,
    string ProductId,
    string SoftwareVersion = "1.0.0")
{
    /// <summary>%LOCALAPPDATA%\WinPortal\CentralScripts\&lt;slug&gt; — mesma pasta da versão Python.</summary>
    public string LicenseDirectory
    {
        get
        {
            var local = Environment.GetEnvironmentVariable("LOCALAPPDATA");
            if (string.IsNullOrEmpty(local))
                local = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(local, "WinPortal", "CentralScripts", AppSlug);
        }
    }

    public string LicenseFile => Path.Combine(LicenseDirectory, "license.dat");
}

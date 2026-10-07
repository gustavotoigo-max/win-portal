using System.Net.Http.Headers;
using System.Security.Authentication;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

public sealed class ActivationRequestException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>Cliente HTTPS do portal (activation/api_client.py). TLS 1.2 ou superior.</summary>
public sealed class LicensingApiClient
{
    internal static Func<HttpMessageHandler>? HandlerFactoryOverride { get; set; }

    private static readonly Lazy<HttpClient> SharedClient = new(CreateClient);

    private static readonly JsonSerializerOptions JsonOptions = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private readonly ProductIdentity _product;
    private readonly HttpClient _http;

    public LicensingApiClient(ProductIdentity product)
    {
        _product = product;
        // O HttpClient compartilhado já nasce com o timeout definido. Alterar propriedades
        // dele depois da primeira requisição lança InvalidOperationException, o que
        // impedia reabrir a janela de ativação.
        _http = HandlerFactoryOverride is null
            ? SharedClient.Value
            : new HttpClient(HandlerFactoryOverride()) { Timeout = TimeSpan.FromSeconds(LicensingConfig.RequestTimeoutSeconds) };
    }

    private static HttpClient CreateClient()
    {
        var handler = new HttpClientHandler
        {
            SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
            CheckCertificateRevocationList = false,
        };
        return new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(LicensingConfig.RequestTimeoutSeconds) };
    }

    private JsonNode Post(string endpoint, JsonObject payload)
    {
        if (!LicensingConfig.LicenseServerBaseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            throw new ActivationRequestException("URL do servidor deve comecar com https://");

        var url = LicensingConfig.LicenseServerBaseUrl.TrimEnd('/') + "/" + endpoint.TrimStart('/');
        Diagnostics.LogStep($"POST {url} com TLS 1.2+");

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(payload.ToJsonString(JsonOptions), Encoding.UTF8, "application/json"),
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.TryAddWithoutValidation("User-Agent", $"{LicensingConfig.AppId}/{_product.SoftwareVersion}");

        string body;
        try
        {
            using var response = _http.Send(request);
            using var stream = response.Content.ReadAsStream();
            using var reader = new StreamReader(stream, Encoding.UTF8);
            body = reader.ReadToEnd();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException or InvalidOperationException)
        {
            throw new ActivationRequestException(ex.Message, ex);
        }

        try
        {
            // Assim como a versão Python, o corpo JSON é lido mesmo em respostas 4xx.
            return JsonNode.Parse(body) ?? throw new ActivationRequestException("Servidor nao retornou JSON valido");
        }
        catch (System.Text.Json.JsonException ex)
        {
            throw new ActivationRequestException("Servidor nao retornou JSON valido", ex);
        }
    }

    public JsonNode Activate(string email, string licenseKey)
    {
        var info = MachineInfo.GetSystemInfo(_product);
        var payload = new JsonObject
        {
            ["app_id"] = LicensingConfig.AppId,
            ["software"] = _product.Software,
            ["email"] = email.Trim().ToLowerInvariant(),
            ["license_key"] = licenseKey.Trim(),
            ["machine_id"] = info.MachineId,
            ["machine_name"] = info.MachineName,
            ["software_version"] = _product.SoftwareVersion,
            ["client_utc"] = info.ClientUtc,
            ["system_info"] = new JsonObject { ["os"] = info.Os, ["arch"] = info.Architecture },
        };
        return Post(LicensingConfig.ActivationEndpoint, payload);
    }

    public JsonNode Revalidate(JsonObject licensePayload)
    {
        var info = MachineInfo.GetSystemInfo(_product);
        var payload = new JsonObject
        {
            ["license_id"] = licensePayload.Get("license_id")?.DeepClone(),
            ["activation_id"] = licensePayload.Get("activation_id")?.DeepClone(),
            ["software"] = _product.Software,
            ["email"] = licensePayload.Get("email")?.DeepClone(),
            ["machine_id"] = info.MachineId,
            ["software_version"] = _product.SoftwareVersion,
            ["client_utc"] = info.ClientUtc,
            ["system_info"] = new JsonObject { ["os"] = info.Os, ["arch"] = info.Architecture },
        };
        return Post(LicensingConfig.RevalidationEndpoint, payload);
    }
}

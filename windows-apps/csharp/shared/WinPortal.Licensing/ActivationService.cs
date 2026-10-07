using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

public sealed record ActivationResult(
    bool Ok,
    string Code,
    string Message,
    JsonNode? Response = null,
    LicenseVerificationResult? Verification = null);

/// <summary>Ativação online (activation/activation_flow.py).</summary>
public sealed class ActivationService(ProductIdentity product)
{
    private readonly LicensingApiClient _api = new(product);
    private readonly LicenseStore _store = new(product);
    private readonly LicenseVerifier _verifier = new(product);

    public ActivationResult ActivateAndSave(string email, string licenseKey)
    {
        email = email.Trim().ToLowerInvariant();
        licenseKey = licenseKey.Trim();

        if (!email.Contains('@') || !email.Contains('.'))
            return new(false, "INVALID_EMAIL", "Informe um e-mail válido.");

        if (licenseKey.Length == 0)
            return new(false, "EMPTY_LICENSE_KEY", "Informe a chave de licença.");

        Diagnostics.LogStep("Fluxo de ativação online iniciado");

        JsonNode node;
        try
        {
            node = _api.Activate(email, licenseKey);
        }
        catch (Exception ex)
        {
            return new(false, "REQUEST_ERROR", $"Falha na requisição de ativação: {ex.Message}");
        }

        Diagnostics.LogStep("1.12 Resposta do servidor recebida pelo fluxo de ativação");

        var response = node as JsonObject;
        if (!response.IsTrue("ok"))
        {
            var message = response.Get("message") is { } m ? m.PyStr() : "Ativação recusada pelo servidor.";
            Diagnostics.LogStep($"Servidor recusou ativação: {message}");
            return new(false, "SERVER_DENIED", message, node);
        }

        if (!response.Get("status").EqualsString("ACTIVE"))
            return new(false, "LICENSE_NOT_ACTIVE", "Licença não está ativa.", node);

        try
        {
            var machineId = MachineInfo.GetMachineId();
            var licensePayload = response.GetObject("license");
            var signature = response.GetStringOrNull("signature");

            if (licensePayload is null || signature is null)
                return new(false, "INVALID_LICENSE_FORMAT", "Resposta de ativação inválida.", node);

            var licenseEmail = (licensePayload.Get("email") is { } e ? e.PyStr() : "").Trim().ToLowerInvariant();
            if (licenseEmail != email)
                return new(false, "EMAIL_MISMATCH", "E-mail da licença não corresponde ao e-mail informado.", node);

            if (!licensePayload.Get("machine_id").EqualsString(machineId))
                return new(false, "MACHINE_MISMATCH", "Licença retornada para outra máquina.", node);

            if (!LicenseCrypto.VerifyEd25519Signature(licensePayload, signature))
                return new(false, "INVALID_SIGNATURE", "Assinatura da licença inválida.", node);

            if (LicenseIdentity.Validate(licensePayload, product) is { } identityError)
                return new(false, identityError.Code, identityError.Message, node);

            _store.SaveLicenseResponse(response!, machineId);
        }
        catch (Exception ex)
        {
            return new(false, "SAVE_LICENSE_ERROR", $"Não foi possível salvar a licença local: {ex.Message}", node);
        }

        var verification = _verifier.VerifyLocalLicense(expectedEmail: email);
        if (!verification.Ok)
            return new(false, verification.Code, verification.Message, node, verification);

        return new(true, "OK", "Ativação concluída com sucesso.", node, verification);
    }
}

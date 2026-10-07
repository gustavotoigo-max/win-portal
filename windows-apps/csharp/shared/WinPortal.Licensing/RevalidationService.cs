using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

public sealed record RevalidationResult(
    bool Ok,
    string Code,
    string Message,
    JsonNode? Response = null,
    LicenseVerificationResult? Verification = null,
    bool Revalidated = false);

/// <summary>Revalidação periódica (activation/revalidation_flow.py).</summary>
public sealed class RevalidationService(ProductIdentity product)
{
    private readonly LicensingApiClient _api = new(product);
    private readonly LicenseStore _store = new(product);
    private readonly LicenseVerifier _verifier = new(product);

    private RevalidationResult FromLocal()
    {
        var verification = _verifier.VerifyLocalLicense();
        return new(false, verification.Code, verification.Message, Verification: verification);
    }

    public RevalidationResult RevalidateIfNeeded(bool force = false)
    {
        Diagnostics.LogStep("3.1 Iniciando verificacao de revalidacao periodica");

        if (!_store.LicenseFileExists())
        {
            Diagnostics.LogStep("3.1 Licenca local ausente. Nao ha o que revalidar");
            return FromLocal();
        }

        var machineId = MachineInfo.GetMachineId();
        JsonObject? currentResponse;
        try
        {
            currentResponse = _store.LoadLicenseResponse(machineId) as JsonObject;
            if (currentResponse is null) throw new InvalidDataException("Conteúdo inválido.");
        }
        catch (Exception ex)
        {
            Diagnostics.LogStep($"3.1 ERRO: nao foi possivel carregar a licenca local para revalidar: {ex.Message}");
            return FromLocal();
        }

        var licensePayload = currentResponse.GetObject("license");
        if (licensePayload is null)
        {
            Diagnostics.LogStep("3.1 ERRO: licenca local sem objeto license");
            return FromLocal();
        }

        DateTimeOffset? lastValidation;
        try { lastValidation = LicenseVerifier.ReferenceDateTime(licensePayload); }
        catch { lastValidation = null; }

        bool needsRevalidation;
        if (lastValidation is null)
        {
            needsRevalidation = true;
            Diagnostics.LogStep("3.1 Licenca sem data de validacao; revalidacao sera solicitada");
        }
        else
        {
            var nextValidation = lastValidation.Value.AddDays(LicensingConfig.RevalidationIntervalDays);
            needsRevalidation = DateTimeOffset.UtcNow >= nextValidation;
            Diagnostics.LogStep($"3.1 Proxima revalidacao planejada para {nextValidation:O}");
        }

        if (!force && !needsRevalidation)
        {
            Diagnostics.LogStep("3.9 Revalidacao ainda nao necessaria. Continuando uso normal");
            var local = _verifier.VerifyLocalLicense();
            return new(local.Ok, local.Code, "Uso normal liberado. Revalidação ainda não necessária.",
                Verification: local, Revalidated: false);
        }

        JsonNode node;
        try
        {
            node = _api.Revalidate(licensePayload);
        }
        catch (Exception ex)
        {
            Diagnostics.LogStep($"3.2 Nao foi possivel conectar ao servidor: {ex.Message}");
            var local = _verifier.VerifyLocalLicense();
            return new(local.Ok, local.Code,
                local.Ok ? "Sem conexão com o servidor. Continuando offline dentro do período permitido." : local.Message,
                Verification: local, Revalidated: false);
        }

        Diagnostics.LogStep("3.4 Validando licenca e maquina novamente");
        var response = node as JsonObject;

        if (!response.IsTrue("ok"))
        {
            var message = response.Get("message") is { } m ? m.PyStr() : "Licença inválida ou revogada. Software bloqueado.";
            Diagnostics.LogStep($"3.5 Servidor recusou revalidacao: {message}");
            return new(false, "SERVER_DENIED", message, node);
        }

        if (!response.Get("status").EqualsString("ACTIVE"))
            return new(false, "LICENSE_NOT_ACTIVE", "Licença não está ativa.", node);

        var newLicensePayload = response.GetObject("license");
        var signature = response.GetStringOrNull("signature");
        if (newLicensePayload is null || signature is null)
        {
            Diagnostics.LogStep("3.5 Resposta de revalidacao sem objeto license valido");
            return new(false, "INVALID_REVALIDATION_RESPONSE", "Resposta de revalidação inválida.", node);
        }

        if (!newLicensePayload.Get("machine_id").EqualsString(machineId))
        {
            Diagnostics.LogStep("3.5 Servidor retornou licenca para outra maquina. Software bloqueado");
            return new(false, "MACHINE_MISMATCH", "Licença inválida para esta máquina. Software bloqueado.", node);
        }

        var currentEmail = (licensePayload.Get("email") is { } ce ? ce.PyStr() : "").Trim().ToLowerInvariant();
        var returnedEmail = (newLicensePayload.Get("email") is { } re ? re.PyStr() : "").Trim().ToLowerInvariant();
        if (currentEmail.Length > 0 && returnedEmail != currentEmail)
        {
            Diagnostics.LogStep("3.5 Servidor retornou licenca para outro e-mail. Software bloqueado");
            return new(false, "EMAIL_MISMATCH", "Licença inválida para este e-mail. Software bloqueado.", node);
        }

        var status = (newLicensePayload.Get("status") is { } s ? s.PyStr() : "").ToUpperInvariant();
        if (newLicensePayload.IsTrue("revoked") || status == "REVOKED")
        {
            Diagnostics.LogStep("3.5 Licenca revogada pelo servidor. Software bloqueado");
            return new(false, "LICENSE_REVOKED", "Licença revogada. Software bloqueado.", node);
        }

        if (!LicenseCrypto.VerifyEd25519Signature(newLicensePayload, signature))
        {
            Diagnostics.LogStep("3.5 Assinatura da revalidacao invalida. Software bloqueado");
            return new(false, "INVALID_SIGNATURE", "Assinatura da licença inválida.", node);
        }

        if (LicenseIdentity.Validate(newLicensePayload, product) is { } identityError)
        {
            Diagnostics.LogStep($"3.5 ERRO: {identityError.Code}");
            return new(false, identityError.Code, identityError.Message, node);
        }

        try
        {
            Diagnostics.LogStep("3.6 Atualizando data da ultima validacao e registro local");
            _store.SaveLicenseResponse(response!, machineId);
        }
        catch (Exception ex)
        {
            return new(false, "SAVE_LICENSE_ERROR", $"Não foi possível atualizar a licença local: {ex.Message}", node);
        }

        Diagnostics.LogStep("3.7 Nova licenca recebida e salva localmente");
        var verification = _verifier.VerifyLocalLicense();
        if (!verification.Ok)
            return new(false, verification.Code, verification.Message, node, verification);

        Diagnostics.LogStep("3.9 Continuacao normal do uso apos revalidacao");
        return new(true, "OK", "Licença revalidada com sucesso.", node, verification, Revalidated: true);
    }
}

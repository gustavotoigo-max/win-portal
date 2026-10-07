using System.Globalization;
using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

public sealed record LicenseVerificationResult(bool Ok, string Code, string Message, JsonObject? LicensePayload = null);

/// <summary>Verificação offline da licença local (activation/offline_verifier.py).</summary>
public sealed class LicenseVerifier(ProductIdentity product)
{
    private readonly LicenseStore _store = new(product);

    internal static DateTimeOffset? ReferenceDateTime(JsonObject licensePayload)
    {
        var value = licensePayload.FirstTruthy("last_validation_utc", "last_server_validation_utc", "issued_at_utc");
        if (!value.IsTruthy()) return null;
        return LicenseDates.Parse(value.PyStr());
    }

    private static int OfflineMaxDays(JsonObject licensePayload)
    {
        var node = licensePayload.Get("offline_max_days");
        if (node is null && !licensePayload.ContainsKey("offline_max_days"))
            return LicensingConfig.OfflineMaxDays;

        var text = node.PyStr();
        if (node is JsonValue v && v.GetValueKind() == System.Text.Json.JsonValueKind.True) return 1;
        if (node is JsonValue f && f.GetValueKind() == System.Text.Json.JsonValueKind.False) return 0;
        if (long.TryParse(text.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var days))
            return (int)Math.Max(0, Math.Min(days, int.MaxValue));
        // int(30.0) também é aceito no Python quando o valor é numérico.
        if (node is JsonValue n && n.GetValueKind() == System.Text.Json.JsonValueKind.Number &&
            double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var real))
            return (int)Math.Max(0, Math.Min(Math.Truncate(real), int.MaxValue));
        return LicensingConfig.OfflineMaxDays;
    }

    public LicenseVerificationResult VerifyLocalLicense(string? expectedEmail = null)
    {
        Diagnostics.LogStep("2.1 Software iniciou em modo de verificacao offline");

        if (!_store.LicenseFileExists())
        {
            Diagnostics.LogStep("2.2 Arquivo de licenca local nao encontrado");
            return new(false, "LICENSE_NOT_FOUND", "Arquivo de licença local não encontrado.");
        }

        Diagnostics.LogStep("2.2 Localizando arquivo de licenca local e preparando descriptografia");
        var machineId = MachineInfo.GetMachineId();

        JsonObject? response;
        try
        {
            response = _store.LoadLicenseResponse(machineId) as JsonObject;
            if (response is null) throw new InvalidDataException("Conteúdo inválido.");
        }
        catch (Exception ex)
        {
            Diagnostics.LogStep($"2.2 ERRO: nao foi possivel descriptografar a licenca local: {ex.Message}");
            return new(false, "LICENSE_DECRYPT_ERROR", "Licença local corrompida ou de outro computador.");
        }

        if (!response.IsTrue("ok"))
        {
            var message = response.Get("message") is { } m ? m.PyStr() : "Servidor recusou a ativação.";
            return new(false, "SERVER_DENIED", message);
        }

        if (!response.Get("status").EqualsString("ACTIVE"))
            return new(false, "LICENSE_NOT_ACTIVE", "Licença não está ativa.");

        var licensePayload = response.GetObject("license");
        var signature = response.GetStringOrNull("signature");
        if (licensePayload is null || signature is null)
        {
            Diagnostics.LogStep("2.3 ERRO: resposta local nao possui license/signature validos");
            return new(false, "INVALID_LICENSE_FORMAT", "Formato da licença local é inválido.");
        }

        Diagnostics.LogStep("2.3 Verificando assinatura digital Ed25519 da licenca");
        if (!LicenseCrypto.VerifyEd25519Signature(licensePayload, signature))
        {
            Diagnostics.LogStep("2.3 Assinatura invalida. Software bloqueado");
            return new(false, "INVALID_SIGNATURE", "Licença inválida ou corrompida. Software bloqueado.");
        }

        if (LicenseIdentity.Validate(licensePayload, product) is { } identityError)
        {
            Diagnostics.LogStep($"2.3 ERRO: {identityError.Code}");
            return new(false, identityError.Code, identityError.Message);
        }

        if (!licensePayload.Get("machine_id").EqualsString(machineId))
        {
            Diagnostics.LogStep("2.3 ERRO: Machine ID da licenca nao corresponde ao computador atual");
            return new(false, "MACHINE_MISMATCH", "Licença pertence a outro computador. Software bloqueado.");
        }

        if (!string.IsNullOrEmpty(expectedEmail))
        {
            var expected = expectedEmail.Trim().ToLowerInvariant();
            var actual = (licensePayload.Get("email") is { } e ? e.PyStr() : "").Trim().ToLowerInvariant();
            if (actual != expected)
            {
                Diagnostics.LogStep("2.3 ERRO: e-mail informado nao corresponde ao e-mail da licenca local");
                return new(false, "EMAIL_MISMATCH", "E-mail não corresponde à licença local.");
            }
        }

        if (!licensePayload.Get("offline_allowed").IsTruthy())
        {
            Diagnostics.LogStep("2.6 ERRO: licenca nao permite uso offline");
            return new(false, "OFFLINE_NOT_ALLOWED", "Licença não permite uso offline.");
        }

        var status = (licensePayload.Get("status") is { } s ? s.PyStr() : "").ToUpperInvariant();
        if (licensePayload.IsTrue("revoked") || status == "REVOKED")
        {
            Diagnostics.LogStep("2.4 Licenca marcada como revogada no cache local. Software bloqueado");
            return new(false, "LICENSE_REVOKED", "Licença revogada. Software bloqueado.");
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAt = licensePayload.Get("expires_at_utc");
        if (expiresAt.IsTruthy())
        {
            if (!LicenseDates.TryParse(expiresAt.PyStr(), out var expiresDt))
            {
                Diagnostics.LogStep("2.5 ERRO: campo expires_at_utc invalido");
                return new(false, "INVALID_EXPIRATION", "Data de expiração inválida.");
            }

            if (expiresDt < nowUtc)
            {
                Diagnostics.LogStep("2.5 Licenca expirada. Conecte-se a internet para continuar");
                return new(false, "LICENSE_EXPIRED", "Modo offline expirado. Conecte-se à internet para continuar.");
            }
        }

        DateTimeOffset? lastValidation;
        try
        {
            lastValidation = ReferenceDateTime(licensePayload);
        }
        catch
        {
            Diagnostics.LogStep("2.6 ERRO: ultima validacao online invalida");
            return new(false, "INVALID_LAST_VALIDATION", "Última validação online inválida.");
        }

        if (lastValidation is null)
        {
            Diagnostics.LogStep("2.6 ERRO: licenca sem issued_at_utc ou last_validation_utc");
            return new(false, "MISSING_LAST_VALIDATION", "Licença sem data de validação online.");
        }

        var offlineMaxDays = OfflineMaxDays(licensePayload);
        var offlineDeadline = lastValidation.Value.AddDays(offlineMaxDays);
        Diagnostics.LogStep($"2.6 Verificando periodo maximo offline: {offlineMaxDays} dias desde {lastValidation:O}");

        if (nowUtc > offlineDeadline)
        {
            Diagnostics.LogStep("2.8 Periodo offline maximo ultrapassado. Requer conexao para revalidacao");
            return new(false, "OFFLINE_PERIOD_EXPIRED", "Requer conexão com a internet para revalidação.");
        }

        Diagnostics.LogStep("2.7 Software inicia normalmente em modo offline");
        return new(true, "OK", "Licença válida para uso offline.", licensePayload);
    }
}

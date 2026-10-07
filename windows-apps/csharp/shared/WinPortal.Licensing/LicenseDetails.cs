using System.Globalization;
using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

public sealed record LicenseDetails(bool Active, string Email, string MaskedKey, string State, string Expiration)
{
    public const string MaskedLicenseKey = "•••••••••••• (protegida)";

    public static string FormatExpiration(JsonNode? value)
    {
        if (!value.IsTruthy()) return "Sem vencimento";
        var text = value.PyStr();
        return LicenseDates.TryParse(text, out var parsed)
            ? parsed.ToLocalTime().ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture)
            : text;
    }

    public static LicenseDetails Build(JsonObject? licensePayload, string? activationMode)
    {
        if (licensePayload is null)
            return new LicenseDetails(false, "", "", "Não ativado", "-");

        var state = activationMode == "online" ? "Ativado online" : "Ativado offline";
        var expiration = licensePayload.FirstTruthy("expires_at_utc", "expires_at", "expiration_date");
        var email = licensePayload.Get("email");
        return new LicenseDetails(
            true,
            email is null ? "" : email.PyStr(),
            MaskedLicenseKey,
            state,
            FormatExpiration(expiration));
    }
}

/// <summary>Leitura de datas ISO 8601 como datetime.fromisoformat (sem fuso = UTC).</summary>
public static class LicenseDates
{
    public static bool TryParse(string text, out DateTimeOffset value)
    {
        return DateTimeOffset.TryParse(
            text.Trim(),
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out value);
    }

    public static DateTimeOffset Parse(string text) =>
        TryParse(text, out var value) ? value : throw new FormatException($"Data inválida: {text}");
}

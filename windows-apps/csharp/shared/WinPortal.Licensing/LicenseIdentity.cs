using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

public static class LicenseIdentity
{
    /// <summary>Valida a identidade do produto dentro do payload assinado.</summary>
    public static (string Code, string Message)? Validate(JsonObject licensePayload, ProductIdentity product)
    {
        if (!licensePayload.Get("app_id").EqualsString(LicensingConfig.AppId))
            return ("APP_ID_MISMATCH", "Licença pertence a outro aplicativo. Software bloqueado.");

        if (!licensePayload.Get("software").EqualsString(product.Software))
            return ("SOFTWARE_MISMATCH", "Licença pertence a outro software. Software bloqueado.");

        if (!licensePayload.Get("product_id").EqualsString(product.ProductId))
            return ("PRODUCT_ID_MISMATCH", "Licença pertence a outro produto. Software bloqueado.");

        return null;
    }
}

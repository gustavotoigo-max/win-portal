using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

/// <summary>Arquivo license.dat cifrado (activation/license_store.py).</summary>
public sealed class LicenseStore(ProductIdentity product)
{
    public string LicenseDirectory => product.LicenseDirectory;
    public string LicenseFile => product.LicenseFile;

    public bool LicenseFileExists() => File.Exists(LicenseFile);

    public void SaveLicenseResponse(JsonNode responseData, string machineId)
    {
        Diagnostics.LogStep($"1.13 Salvando arquivo de licença em: {LicenseFile}");
        Directory.CreateDirectory(LicenseDirectory);
        var encrypted = LicenseCrypto.EncryptJsonForMachine(responseData, machineId);
        var text = encrypted.ToJsonString(new JsonSerializerOptions { WriteIndented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
        File.WriteAllText(LicenseFile, text.Replace("\r\n", "\n"));
        Diagnostics.LogStep("1.13 Arquivo de licença salvo localmente");
    }

    public JsonNode? LoadLicenseResponse(string machineId)
    {
        Diagnostics.LogStep($"Carregando arquivo de licença local: {LicenseFile}");
        var encrypted = JsonNode.Parse(File.ReadAllText(LicenseFile)) as JsonObject
            ?? throw new InvalidDataException("Arquivo de licença inválido.");
        return LicenseCrypto.DecryptJsonForMachine(encrypted, machineId);
    }

    /// <summary>Remove a licença local e a pasta, se vazia.</summary>
    public bool ClearActivationFiles()
    {
        var ok = true;
        try
        {
            if (File.Exists(LicenseFile)) File.Delete(LicenseFile);
        }
        catch { ok = false; }

        try
        {
            if (Directory.Exists(LicenseDirectory) && !Directory.EnumerateFileSystemEntries(LicenseDirectory).Any())
                Directory.Delete(LicenseDirectory);
        }
        catch { ok = false; }
        return ok;
    }
}

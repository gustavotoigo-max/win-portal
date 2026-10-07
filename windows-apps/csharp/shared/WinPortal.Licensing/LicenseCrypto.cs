using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;
using Org.BouncyCastle.Security;

namespace WinPortal.Licensing;

/// <summary>
/// Criptografia da licença, compatível com activation/crypto_utils.py:
/// Ed25519 sobre o JSON canônico e arquivo local em AES-256-GCM com chave
/// HKDF-SHA256 derivada do Machine ID.
/// </summary>
public static class LicenseCrypto
{
    private static readonly byte[] HkdfSalt = Encoding.ASCII.GetBytes("TemplateAtivacao::license-file::v1");
    private static readonly byte[] HkdfInfo = Encoding.ASCII.GetBytes("local-license-aes-256-gcm");
    private const int NonceSize = 12;
    private const int TagSize = 16;

    internal static string? PublicKeyOverride { get; set; }

    public static Ed25519PublicKeyParameters LoadEd25519PublicKey(string publicKeyBase64)
    {
        var keyBytes = Convert.FromBase64String(publicKeyBase64);
        if (keyBytes.Length == 32)
            return new Ed25519PublicKeyParameters(keyBytes, 0);

        // Formato DER SubjectPublicKeyInfo (MCowBQYDK2VwAyEA...).
        var key = PublicKeyFactory.CreateKey(keyBytes);
        return key as Ed25519PublicKeyParameters
            ?? throw new InvalidOperationException("A chave publica nao e Ed25519");
    }

    public static bool VerifyEd25519Signature(JsonObject payload, string signatureBase64)
    {
        Diagnostics.LogStep("Verificando assinatura digital Ed25519 da licenca");
        try
        {
            var publicKey = LoadEd25519PublicKey(PublicKeyOverride ?? LicensingConfig.Ed25519PublicKeyBase64);
            var signature = Convert.FromBase64String(signatureBase64);
            var message = CanonicalJson.ToUtf8Bytes(payload);

            var verifier = new Ed25519Signer();
            verifier.Init(false, publicKey);
            verifier.BlockUpdate(message, 0, message.Length);
            return verifier.VerifySignature(signature);
        }
        catch
        {
            return false;
        }
    }

    public static byte[] DeriveAes256KeyFromMachineId(string machineId) =>
        HKDF.DeriveKey(HashAlgorithmName.SHA256, Encoding.UTF8.GetBytes(machineId), 32, HkdfSalt, HkdfInfo);

    /// <summary>Gera o mesmo envelope de encrypt_json_for_machine.</summary>
    public static JsonObject EncryptJsonForMachine(JsonNode data, string machineId)
    {
        var key = DeriveAes256KeyFromMachineId(machineId);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var plaintext = CanonicalJson.ToUtf8Bytes(data);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TagSize];

        using (var aes = new AesGcm(key, TagSize))
            aes.Encrypt(nonce, plaintext, ciphertext, tag, Encoding.UTF8.GetBytes(machineId));

        // A biblioteca cryptography (Python) anexa a tag ao final do texto cifrado.
        var combined = new byte[ciphertext.Length + TagSize];
        Buffer.BlockCopy(ciphertext, 0, combined, 0, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, combined, ciphertext.Length, TagSize);

        return new JsonObject
        {
            ["format"] = "central-scripts-license-v1",
            ["alg"] = "AES-256-GCM",
            ["kdf"] = "HKDF-SHA256(machine_id)",
            ["nonce"] = Convert.ToBase64String(nonce),
            ["ciphertext"] = Convert.ToBase64String(combined),
        };
    }

    public static JsonNode? DecryptJsonForMachine(JsonObject encrypted, string machineId)
    {
        var key = DeriveAes256KeyFromMachineId(machineId);
        var nonce = Convert.FromBase64String(encrypted.GetStringOrNull("nonce") ?? throw new InvalidDataException("nonce"));
        var combined = Convert.FromBase64String(encrypted.GetStringOrNull("ciphertext") ?? throw new InvalidDataException("ciphertext"));
        if (combined.Length < TagSize) throw new InvalidDataException("ciphertext");

        var ciphertext = combined.AsSpan(0, combined.Length - TagSize);
        var tag = combined.AsSpan(combined.Length - TagSize);
        var plaintext = new byte[ciphertext.Length];

        using (var aes = new AesGcm(key, TagSize))
            aes.Decrypt(nonce, ciphertext, tag, plaintext, Encoding.UTF8.GetBytes(machineId));

        return JsonNode.Parse(plaintext, documentOptions: new JsonDocumentOptions { MaxDepth = 64 });
    }
}

// Testes de compatibilidade da licença C# com a versão Python e com o portal.
// Uso: dotnet run -- <pasta-fixtures> [--live]
// Requer Python 3 com o pacote "cryptography" e Node.js no PATH.
using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using WinPortal.Licensing;

var fixtures = Path.GetFullPath(args[0]);
var live = args.Contains("--live");
var failures = 0;
void Check(string name, bool ok) { Console.WriteLine($"{(ok ? "PASS" : "FAIL")}  {name}"); if (!ok) failures++; }
string Run(string file, string arguments, string? env = null)
{
    if (file == "python3" && OperatingSystem.IsWindows()) file = "python";
    var psi = new ProcessStartInfo(file, arguments) { RedirectStandardOutput = true, RedirectStandardError = true, WorkingDirectory = fixtures };
    psi.Environment["PUBKEY_FILE"] = Path.Combine(fixtures, "pub.txt");
    using var p = Process.Start(psi)!;
    var output = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
    p.WaitForExit();
    return output.Trim();
}

var product = new ProductIdentity("Image Analyzer", "image_analyzer", "ImageAnalyzer", "ImageAnalyzer", "image-analyzer");
const string RawId = "windows:5a3c1f6e-1111-2222-3333-444455556666";
MachineInfo.RawIdentifierOverride = () => RawId;
var machineId = MachineInfo.GetMachineId();

// O mesmo cálculo do machine.py.
var pyMachineId = Run("python3", $"-c \"import hashlib;print(hashlib.sha256('com.winportal.windowssoftware|{RawId}'.encode()).hexdigest())\"");
Check("Machine ID igual ao Python", pyMachineId == machineId);

// 1. Assinaturas geradas pelo portal (Node) para este Machine ID.
Run("node", $"sign.mjs {machineId} .");
var publicKey = File.ReadAllText(Path.Combine(fixtures, "pub.txt")).Trim();
LicenseCrypto.PublicKeyOverride = publicKey;
var activationJson = File.ReadAllText(Path.Combine(fixtures, "activation.json"));
var response = JsonNode.Parse(activationJson)!.AsObject();
var license = response["license"]!.AsObject();

Check("JSON canônico igual ao do portal", CanonicalJson.Serialize(license) == File.ReadAllText(Path.Combine(fixtures, "canonical.txt"), Encoding.UTF8));
Check("Assinatura do portal aceita", LicenseCrypto.VerifyEd25519Signature(license, response["signature"]!.GetValue<string>()));
var tampered = license.DeepClone().AsObject(); tampered["offline_max_days"] = 3650;
Check("Assinatura recusada após adulteração", !LicenseCrypto.VerifyEd25519Signature(tampered, response["signature"]!.GetValue<string>()));
// Manifesto de atualização (/api/atualizacoes) assinado pelo portal com a mesma chave.
Run("node", "sign-update.mjs .");
var update = JsonNode.Parse(File.ReadAllText(Path.Combine(fixtures, "update.json")))!.AsObject();
var manifest = update["manifest"]!.AsObject();
Check("Manifesto de atualização do portal aceito", LicenseCrypto.VerifyEd25519Signature(manifest, update["signature"]!.GetValue<string>()));
var forged = manifest.DeepClone().AsObject(); forged["latest"]!["installer"]!["url"] = "https://exemplo.com/malicioso.exe";
Check("Manifesto adulterado recusado", !LicenseCrypto.VerifyEd25519Signature(forged, update["signature"]!.GetValue<string>()));
LicenseCrypto.PublicKeyOverride = null;
Check("Chave pública real (DER) carrega", LicenseCrypto.LoadEd25519PublicKey(LicensingConfig.Ed25519PublicKeyBase64) is not null);
Check("Assinatura de teste recusada com a chave real", !LicenseCrypto.VerifyEd25519Signature(license, response["signature"]!.GetValue<string>()));
LicenseCrypto.PublicKeyOverride = publicKey;

// 2. license.dat: Python → C# e C# → Python.
File.WriteAllText(Path.Combine(fixtures, "py-license.dat"), Run("python3", $"pycheck.py encrypt activation.json {machineId}"));
var fromPython = LicenseCrypto.DecryptJsonForMachine(JsonNode.Parse(File.ReadAllText(Path.Combine(fixtures, "py-license.dat")))!.AsObject(), machineId)!.AsObject();
Check("C# lê license.dat gravado pelo Python", CanonicalJson.Serialize(fromPython) == CanonicalJson.Serialize(response));
var store = new LicenseStore(product);

// 3. Fluxo completo de ativação com servidor simulado.
var tempLocal = Directory.CreateTempSubdirectory("winportal-test-");
Environment.SetEnvironmentVariable("LOCALAPPDATA", tempLocal.FullName);
JsonObject? lastRequest = null; string? lastUrl = null; string? lastAgent = null;
string nextBody = activationJson; var nextStatus = HttpStatusCode.OK;
LicensingApiClient.HandlerFactoryOverride = () => new FakeHandler(req =>
{
    lastUrl = req.RequestUri!.ToString();
    lastAgent = req.Headers.UserAgent.ToString();
    lastRequest = JsonNode.Parse(req.Content!.ReadAsStringAsync().Result)!.AsObject();
    return new HttpResponseMessage(nextStatus) { Content = new StringContent(nextBody, Encoding.UTF8, "application/json") };
});

var activation = new ActivationService(product).ActivateAndSave("  Cliente.JOÃO@exemplo.com ", "  WIN-7F3A-91C2-44DE-B810 ");
Check($"Ativação concluída ({activation.Code}: {activation.Message})", activation.Ok);
Check("POST em /api/ativar", lastUrl == "https://win-portal.vercel.app/api/ativar");
Check("User-Agent igual ao Python", lastAgent == "com.winportal.windowssoftware/1.0.0");
var expectedKeys = "app_id,software,email,license_key,machine_id,machine_name,software_version,client_utc,system_info";
Check("Campos do pedido de ativação iguais ao Python", string.Join(",", lastRequest!.Select(p => p.Key)) == expectedKeys);
Check("E-mail normalizado e chave sem espaços", lastRequest!["email"]!.GetValue<string>() == "cliente.joão@exemplo.com" && lastRequest!["license_key"]!.GetValue<string>() == "WIN-7F3A-91C2-44DE-B810");
Check("client_utc no formato Z", System.Text.RegularExpressions.Regex.IsMatch(lastRequest!["client_utc"]!.GetValue<string>(), @"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$"));
Check("Licença salva no caminho da versão Python", File.Exists(Path.Combine(tempLocal.FullName, "WinPortal", "CentralScripts", "image_analyzer", "license.dat")));
var pyRead = Run("python3", $"pycheck.py decrypt \"{product.LicenseFile}\" {machineId}");
Check($"Python lê license.dat gravado pelo C# ({pyRead})", pyRead == "True cliente.joão@exemplo.com");
var details = LicenseDetails.Build(activation.Verification!.LicensePayload, "online");
Check("Detalhes: sem vencimento", details.Expiration == "Sem vencimento" && details.State == "Ativado online");

// Recusas.
nextBody = File.ReadAllText(Path.Combine(fixtures, "wrong-product.json"));
var wrong = new ActivationService(product).ActivateAndSave("cliente.joão@exemplo.com", "WIN-1");
Check($"Licença de outro produto recusada ({wrong.Code})", !wrong.Ok && wrong.Code == "SOFTWARE_MISMATCH");
nextBody = activationJson;
var otherEmail = new ActivationService(product).ActivateAndSave("outro@exemplo.com", "WIN-1");
Check($"E-mail divergente recusado ({otherEmail.Code})", !otherEmail.Ok && otherEmail.Code == "EMAIL_MISMATCH");
nextBody = "{\"ok\":false,\"status\":\"DENIED\",\"code\":\"INVALID_LICENSE_KEY\",\"message\":\"Licenca nao encontrada.\"}"; nextStatus = HttpStatusCode.NotFound;
var denied = new ActivationService(product).ActivateAndSave("cliente@exemplo.com", "WIN-0000");
Check($"Erro 404 do portal lido como JSON ({denied.Message})", !denied.Ok && denied.Code == "SERVER_DENIED" && denied.Message == "Licenca nao encontrada.");
nextBody = "<html>erro</html>"; nextStatus = HttpStatusCode.BadGateway;
var notJson = new ActivationService(product).ActivateAndSave("cliente@exemplo.com", "WIN-0000");
Check($"Resposta não JSON vira REQUEST_ERROR ({notJson.Message})", notJson.Code == "REQUEST_ERROR");
nextStatus = HttpStatusCode.OK;

// 4. Verificação offline e revalidação.
var verifier = new LicenseVerifier(product);
Check("Verificação offline OK", verifier.VerifyLocalLicense().Ok);
var reval = new RevalidationService(product).RevalidateIfNeeded();
Check($"Revalidação não necessária ({reval.Message})", reval.Ok && !reval.Revalidated);

var old = DateTime.UtcNow.AddDays(-8).ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
Run("node", $"sign.mjs {machineId} . {old}");
store.SaveLicenseResponse(JsonNode.Parse(File.ReadAllText(Path.Combine(fixtures, "activation.json")))!, machineId);
Run("node", $"sign.mjs {machineId} .");
nextBody = File.ReadAllText(Path.Combine(fixtures, "activation.json"));
lastUrl = null;
reval = new RevalidationService(product).RevalidateIfNeeded();
Check($"Revalidação após 7 dias ({reval.Message})", reval.Ok && reval.Revalidated && lastUrl == "https://win-portal.vercel.app/api/revalidar");
Check("Campos do pedido de revalidação iguais ao Python", string.Join(",", lastRequest!.Select(p => p.Key)) == "license_id,activation_id,software,email,machine_id,software_version,client_utc,system_info");

Run("node", $"sign.mjs {machineId} . {old}");
store.SaveLicenseResponse(JsonNode.Parse(File.ReadAllText(Path.Combine(fixtures, "activation.json")))!, machineId);
LicensingApiClient.HandlerFactoryOverride = () => new FakeHandler(_ => throw new HttpRequestException("sem rede"));
reval = new RevalidationService(product).RevalidateIfNeeded();
Check($"Sem rede: continua offline dentro do prazo ({reval.Message})", reval.Ok && !reval.Revalidated);

var veryOld = DateTime.UtcNow.AddDays(-31).ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
Run("node", $"sign.mjs {machineId} . {veryOld}");
store.SaveLicenseResponse(JsonNode.Parse(File.ReadAllText(Path.Combine(fixtures, "activation.json")))!, machineId);
reval = new RevalidationService(product).RevalidateIfNeeded();
Check($"Sem rede após 30 dias: bloqueia ({reval.Code})", !reval.Ok && reval.Code == "OFFLINE_PERIOD_EXPIRED");

MachineInfo.RawIdentifierOverride = () => "windows:outro-computador";
Check("Licença de outro computador recusada", new LicenseVerifier(product).VerifyLocalLicense().Code == "LICENSE_DECRYPT_ERROR");
MachineInfo.RawIdentifierOverride = () => RawId;

// 5. Opcional: pedido real ao portal com chave inexistente (não altera nada no servidor).
if (live)
{
    LicensingApiClient.HandlerFactoryOverride = null;
    LicenseCrypto.PublicKeyOverride = null;
    var real = new ActivationService(product).ActivateAndSave("teste.integracao@exemplo.com", "WIN-0000-0000-0000-0000");
    Console.WriteLine($"      portal respondeu: {real.Code} | {real.Message}");
    Check("Portal real aceitou o formato do pedido (chave inexistente)", real.Code == "SERVER_DENIED" && real.Message.Contains("Licenca nao encontrada"));
}

// Reabrir a ativação cria um novo cliente sobre o HttpClient compartilhado, que já fez
// uma requisição; isso não pode lançar exceção.
LicensingApiClient.HandlerFactoryOverride = null;
new ActivationService(product).ActivateAndSave("reabrir@exemplo.com", "WIN-0000-0000-0000-0000");
var reopenError = "";
try { new ActivationService(product).ActivateAndSave("reabrir@exemplo.com", "WIN-0000-0000-0000-0000"); }
catch (Exception ex) { reopenError = ex.Message; }
Check($"Ativação pode ser aberta de novo após uma requisição {reopenError}".TrimEnd(), reopenError.Length == 0);

tempLocal.Delete(true);
Console.WriteLine(failures == 0 ? "\nTodos os testes passaram." : $"\n{failures} teste(s) falharam.");
return failures == 0 ? 0 : 1;

sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(respond(request));
    protected override HttpResponseMessage Send(HttpRequestMessage request, CancellationToken cancellationToken) => respond(request);
}

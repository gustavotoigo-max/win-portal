using System.ComponentModel;
using System.Diagnostics;
using System.Net.Http;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using System.Windows;
using WinPortal.Licensing;
using WinPortal.Ui.Common;

namespace WinPortal.Ui.Updates;

public sealed record UpdateAsset(string Name, string Url, long Size, string Sha256);

public sealed record UpdateInfo(Version Version, string? NotesUrl, UpdateAsset Portable, UpdateAsset Installer);

/// <summary>
/// Atualização automática. O portal informa a versão mais recente de cada executável
/// em /api/atualizacoes/&lt;Exe&gt;, num manifesto assinado com a mesma chave Ed25519 das
/// licenças. O arquivo baixado só é usado se o SHA-256 bater com o do manifesto.
/// Instalado pelo instalador: roda o instalador novo em modo silencioso, que reabre
/// o aplicativo. Executável avulso: troca o .exe ao lado e reabre.
/// </summary>
public static class UpdateService
{
    private const string Section = "interface";
    private const string ManifestKind = "winportal-update-v1";
    public static readonly TimeSpan CheckInterval = TimeSpan.FromHours(6);

    private static readonly Lazy<HttpClient> Http = new(() =>
    {
        var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = true }) { Timeout = Timeout.InfiniteTimeSpan };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("WinPortal-Updater/1.0");
        return client;
    });

    /// <summary>Versão deste executável (definida na publicação com -p:Version).</summary>
    public static Version CurrentVersion
    {
        get
        {
            var version = (Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly()).GetName().Version ?? new Version(1, 0, 0);
            return new Version(version.Major, version.Minor, Math.Max(version.Build, 0));
        }
    }

    public static bool AutoCheck
    {
        get => ToolSettings.Get(Section, "auto_update_check") != "false";
        set => ToolSettings.Set(Section, "auto_update_check", value ? "true" : "false");
    }

    /// <summary>Instalado pelo Inno Setup (há o desinstalador ao lado do executável).</summary>
    public static bool IsInstalled =>
        Directory.EnumerateFiles(AppContext.BaseDirectory, "unins*.exe").Any();

    private static string? Str(JsonObject obj, string key) =>
        obj[key] is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    private static UpdateAsset? ParseAsset(JsonNode? node)
    {
        if (node is not JsonObject obj) return null;
        var name = Str(obj, "name");
        var url = Str(obj, "url");
        var sha = Str(obj, "sha256");
        long size = obj["size"] is JsonValue sv && sv.TryGetValue<long>(out var s) ? s : 0;
        if (name is null || url is null || sha is null || sha.Length != 64) return null;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) return null;
        if (name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) return null;
        return new UpdateAsset(name, url, size, sha.ToLowerInvariant());
    }

    /// <summary>Consulta o portal. Retorna a versão nova, ou null se este executável já está atualizado.</summary>
    public static async Task<UpdateInfo?> CheckAsync(string executable, CancellationToken cancel = default)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancel);
        timeout.CancelAfter(TimeSpan.FromSeconds(20));
        var url = $"{LicensingConfig.LicenseServerBaseUrl}/api/atualizacoes/{Uri.EscapeDataString(executable)}?versao={CurrentVersion}";
        using var response = await Http.Value.GetAsync(url, timeout.Token);
        response.EnsureSuccessStatusCode();
        var body = JsonNode.Parse(await response.Content.ReadAsStringAsync(timeout.Token)) as JsonObject
                   ?? throw new InvalidDataException("Resposta inválida do servidor de atualizações.");

        if (body["manifest"] is not JsonObject manifest || Str(body, "signature") is not { } signature ||
            !LicenseCrypto.VerifyEd25519Signature(manifest, signature))
            throw new InvalidDataException("A resposta do servidor de atualizações não tem uma assinatura válida.");
        if (Str(manifest, "kind") != ManifestKind ||
            !string.Equals(Str(manifest, "executable"), executable, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("O servidor de atualizações respondeu por outro aplicativo.");

        if (manifest["latest"] is not JsonObject latest) return null;
        if (!Version.TryParse(Str(latest, "version"), out var version) || version <= CurrentVersion) return null;
        var portable = ParseAsset(latest["portable"]);
        var installer = ParseAsset(latest["installer"]);
        if (portable is null || installer is null) return null;
        return new UpdateInfo(version, Str(latest, "notes_url"), portable, installer);
    }

    /// <summary>Baixa o arquivo certo para esta instalação e confere o SHA-256.</summary>
    public static async Task<string> DownloadAsync(UpdateInfo update, string executable, IProgress<double>? progress,
        CancellationToken cancel = default)
    {
        var asset = IsInstalled ? update.Installer : update.Portable;
        var folder = Path.Combine(Path.GetTempPath(), "WinPortal", "Atualizacoes", $"{executable}-{update.Version}");
        Directory.CreateDirectory(folder);
        var target = Path.Combine(folder, asset.Name);
        var partial = target + ".part";

        using (var response = await Http.Value.GetAsync(asset.Url, HttpCompletionOption.ResponseHeadersRead, cancel))
        {
            response.EnsureSuccessStatusCode();
            var total = response.Content.Headers.ContentLength ?? asset.Size;
            await using var source = await response.Content.ReadAsStreamAsync(cancel);
            await using (var file = new FileStream(partial, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16, useAsync: true))
            {
                using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
                var buffer = new byte[1 << 16];
                long done = 0;
                int read;
                while ((read = await source.ReadAsync(buffer, cancel)) > 0)
                {
                    await file.WriteAsync(buffer.AsMemory(0, read), cancel);
                    sha.AppendData(buffer, 0, read);
                    done += read;
                    if (total > 0) progress?.Report((double)done / total);
                }
                var hash = Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant();
                if (hash != asset.Sha256)
                {
                    file.Close();
                    File.Delete(partial);
                    throw new InvalidDataException("O arquivo baixado não confere com a versão publicada. Tente de novo mais tarde.");
                }
            }
        }

        File.Move(partial, target, overwrite: true);
        return target;
    }

    /// <summary>
    /// Inicia a atualização. Retorna true se o aplicativo deve fechar agora
    /// (o instalador ou a nova versão vão reabri-lo).
    /// </summary>
    public static bool Apply(string downloaded)
    {
        if (IsInstalled)
        {
            try
            {
                // O instalador pede permissão de administrador (UAC) e reabre o aplicativo no fim.
                Process.Start(new ProcessStartInfo(downloaded, "/SILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /RELAUNCH")
                {
                    UseShellExecute = true,
                });
                return true;
            }
            catch (Win32Exception ex) when (ex.NativeErrorCode == 1223)
            {
                return false; // O usuário recusou a permissão.
            }
        }

        // Executável avulso: um .exe em uso pode ser renomeado, então a versão atual vira
        // ".old" (apagada na próxima abertura) e a nova assume o nome original.
        var current = Environment.ProcessPath ?? throw new InvalidOperationException("Caminho do executável desconhecido.");
        var old = current + ".old";
        if (File.Exists(old)) File.Delete(old);
        File.Move(current, old);
        try
        {
            File.Copy(downloaded, current, overwrite: false);
        }
        catch
        {
            File.Move(old, current);
            throw;
        }
        Process.Start(new ProcessStartInfo(current) { UseShellExecute = false, WorkingDirectory = AppContext.BaseDirectory });
        return true;
    }

    /// <summary>Remove a versão anterior deixada por uma atualização do executável avulso.</summary>
    public static void CleanupPreviousVersion()
    {
        try
        {
            var old = Environment.ProcessPath + ".old";
            if (File.Exists(old)) File.Delete(old);
        }
        catch
        {
            // Pode estar em uso por alguns instantes; fica para a próxima abertura.
        }
    }
}

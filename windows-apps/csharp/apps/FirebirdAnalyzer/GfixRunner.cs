using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.Text;

namespace WinPortal.Apps.FirebirdAnalyzer;

/// <summary>Execução do gfix e classificação da saída (firebird_analyzer/core/tool.py).</summary>
internal static class GfixRunner
{
    // Mensagens do gfix que indicam dano físico nas páginas do banco.
    private static readonly string[] CorruptionMarkers =
    [
        "database file appears corrupt", "bad checksum", "checksum error",
        "page is not a pointer page", "page is not a data page", "wrong page type",
        "record backversion", "database file corrupt", "I/O error",
        "internal gds consistency check", "can't continue after bugcheck",
        "index root page", "Decompression error", "Blob not found",
        "fragmented record", "Error reading data from the connection",
        "page 0 is not a header page", "unknown page type", "pointer page lost",
        "index corrupt", "error while trying to read from file",
        "page number out of range", "Relation is not found",
    ];

    private static readonly string[] CredentialMarkers =
    [
        "password", "user name", "login", "no permission", "access is denied",
        "lock conflict", "database is locked", "cannot attach", "unavailable database",
        "file not found", "permission denied",
    ];

    public static readonly HashSet<string> Extensions = new(StringComparer.OrdinalIgnoreCase) { ".fdb", ".gdb" };

    private static Encoding ConsoleEncoding()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        try { return Encoding.GetEncoding(CultureInfo.CurrentCulture.TextInfo.ANSICodePage); }
        catch { return Encoding.UTF8; }
    }

    public static (int ReturnCode, string Output) Validate(string gfix, string database, string user, string password, int timeoutSeconds,
        CancellationToken cancel = default)
    {
        var info = new ProcessStartInfo(gfix)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = ConsoleEncoding(),
            StandardErrorEncoding = ConsoleEncoding(),
        };
        foreach (var arg in new[] { "-v", "-full", database, "-user", user, "-password", password })
            info.ArgumentList.Add(arg);

        Process process;
        try
        {
            process = Process.Start(info) ?? throw new Win32Exception(2);
        }
        catch (Win32Exception)
        {
            return (127, $"gfix não encontrado em '{gfix}'.");
        }

        using (process)
        {
            var stdout = process.StandardOutput.ReadToEndAsync();
            var stderr = process.StandardError.ReadToEndAsync();
            var deadline = Environment.TickCount64 + timeoutSeconds * 1000L;
            while (!process.WaitForExit(200))
            {
                if (cancel.IsCancellationRequested)
                {
                    try { process.Kill(entireProcessTree: true); } catch { }
                    return (130, "Cancelado pelo usuário.");
                }
                if (Environment.TickCount64 >= deadline)
                {
                    try { process.Kill(entireProcessTree: true); } catch { }
                    return (124, "Tempo excedido.");
                }
            }
            process.WaitForExit();
            var output = (stdout.Result ?? "") + "\n" + (stderr.Result ?? "");
            return (process.ExitCode, output.Trim());
        }
    }

    public static string Classify(int returnCode, string output)
    {
        var text = (output ?? "").ToLowerInvariant();
        if (CorruptionMarkers.Any(marker => text.Contains(marker.ToLowerInvariant())))
            return "Corrompido";

        if (returnCode == 0 && (text.Trim().Length == 0 || text.Contains("validation finished") || text.Contains("summary of validation")))
            return "OK";

        if (CredentialMarkers.Any(text.Contains))
            return "Indeterminado (credencial/acesso)";

        return returnCode == 0 ? "OK" : "Indeterminado";
    }

    public static IEnumerable<string> DatabaseFiles(string target)
    {
        if (File.Exists(target))
        {
            if (Extensions.Contains(Path.GetExtension(target))) yield return target;
            yield break;
        }
        foreach (var file in FileWalker.AllFiles(target))
            if (Extensions.Contains(Path.GetExtension(file))) yield return file;
    }
}

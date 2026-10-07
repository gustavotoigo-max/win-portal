using System.Globalization;
using System.Net;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace WinPortal.Licensing;

/// <summary>Informações do computador enviadas ao portal (activation/machine.py).</summary>
public sealed record SystemInfo(
    string MachineId,
    string MachineName,
    string SoftwareVersion,
    string ClientUtc,
    string Os,
    string Architecture);

public static class MachineInfo
{
    internal static Func<string>? RawIdentifierOverride { get; set; }

    public static string UtcNowZ() =>
        DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    /// <summary>Equivalente a platform.machine() normalizado ("AMD64" → "x64").</summary>
    public static string NormalizedArchitecture() => RuntimeInformation.OSArchitecture switch
    {
        Architecture.X64 => "x64",
        Architecture.Arm64 => "ARM64",
        Architecture.X86 => "x86",
        var other => other.ToString(),
    };

    /// <summary>Equivalente a f"{platform.system()} {platform.release()}".</summary>
    public static string FriendlyOsName()
    {
        if (!OperatingSystem.IsWindows())
            return RuntimeInformation.OSDescription;

        var version = Environment.OSVersion.Version;
        var release = (version.Major, version.Minor) switch
        {
            (10, _) => version.Build >= 22000 ? "11" : "10",
            (6, 3) => "8.1",
            (6, 2) => "8",
            (6, 1) => "7",
            _ => $"{version.Major}.{version.Minor}",
        };
        return $"Windows {release}";
    }

    private static string? ReadWindowsMachineGuid()
    {
        if (!OperatingSystem.IsWindows()) return null;
        try
        {
            // A versão Python (64 bits) lê a visão de 64 bits do registro.
            using var hklm = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64);
            using var key = hklm.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            return key?.GetValue("MachineGuid")?.ToString();
        }
        catch
        {
            return null;
        }
    }

    private static string? ReadLinuxMachineId()
    {
        foreach (var candidate in new[] { "/etc/machine-id", "/var/lib/dbus/machine-id" })
        {
            try
            {
                var value = File.ReadAllText(candidate, Encoding.UTF8).Trim();
                if (value.Length > 0) return value;
            }
            catch { }
        }
        return null;
    }

    /// <summary>Aproximação de uuid.getnode(): MAC da primeira interface física.</summary>
    private static long GetNode()
    {
        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                var bytes = nic.GetPhysicalAddress().GetAddressBytes();
                if (bytes.Length != 6) continue;
                long value = 0;
                foreach (var b in bytes) value = (value << 8) | b;
                if (value != 0) return value;
            }
        }
        catch { }
        return 0;
    }

    public static string MachineName()
    {
        try { return Dns.GetHostName(); }
        catch { return Environment.MachineName; }
    }

    /// <summary>Identificador bruto do equipamento (nunca enviado ao servidor).</summary>
    public static string GetRawMachineIdentifier()
    {
        if (RawIdentifierOverride is not null) return RawIdentifierOverride();
        Diagnostics.LogStep("1.2 Coletando identificador bruto do computador");

        var machineGuid = ReadWindowsMachineGuid();
        if (!string.IsNullOrEmpty(machineGuid)) return $"windows:{machineGuid}";

        var machineId = OperatingSystem.IsLinux() ? ReadLinuxMachineId() : null;
        if (!string.IsNullOrEmpty(machineId)) return $"linux:{machineId}";

        var username = Environment.UserName;
        if (string.IsNullOrEmpty(username)) username = "unknown";
        return $"fallback:{MachineName()}:{GetNode()}:{username}";
    }

    /// <summary>Machine ID estável e não reversível: SHA-256("app_id|bruto") em hexadecimal.</summary>
    public static string GetMachineId()
    {
        var raw = GetRawMachineIdentifier();
        var digest = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{LicensingConfig.AppId}|{raw}"))).ToLowerInvariant();
        Diagnostics.LogStep($"1.2 Machine ID calculado: {digest[..12]}...{digest[^8..]}");
        return digest;
    }

    public static SystemInfo GetSystemInfo(ProductIdentity product)
    {
        var info = new SystemInfo(
            GetMachineId(),
            MachineName(),
            product.SoftwareVersion,
            UtcNowZ(),
            FriendlyOsName(),
            NormalizedArchitecture());
        Diagnostics.LogStep("1.2 Informações coletadas: versão, data/hora UTC e sistema operacional");
        return info;
    }
}

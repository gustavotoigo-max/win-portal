using System.Text;

namespace WinPortal.Apps.DwgCleaner;

/// <summary>Heurística da versão Python (core/tool.py), sem alterações nos limites.</summary>
internal static class DwgValidator
{
    // Versões do AutoCAD (AC1015 = 2000, AC1024 = 2010, AC1032 = 2018 ...).
    private static readonly HashSet<string> ValidVersions =
        ["AC1012", "AC1013", "AC1014", "AC1015", "AC1018", "AC1021", "AC1024", "AC1027", "AC1032"];

    private const int MinSizeBytes = 4096;
    private const double MinNonZeroRatio = 0.01;
    private const double MinEntropyRatio = 0.02;

    private static bool LooksLikeDwgHeader(ReadOnlySpan<byte> first16)
    {
        if (first16.Length < 6) return false;
        var prefix = first16[..6];
        if (ValidVersions.Contains(Encoding.Latin1.GetString(prefix))) return true;
        return prefix[..4].SequenceEqual("AC10"u8) && char.IsAsciiDigit((char)prefix[4]) && char.IsAsciiDigit((char)prefix[5]);
    }

    private static double NonZeroRatio(ReadOnlySpan<byte> sample)
    {
        if (sample.IsEmpty) return 0;
        var nonZero = 0;
        foreach (var b in sample) if (b != 0) nonZero++;
        return (double)nonZero / sample.Length;
    }

    private static double QuickEntropy(FileStream stream, long size, int maxBytes = 65536)
    {
        if (size == 0) return 0;
        var data = new byte[(int)Math.Min(size, maxBytes)];
        stream.Position = 0;
        var read = stream.ReadAtLeast(data, data.Length, throwOnEndOfStream: false);
        var seen = new bool[256];
        var unique = 0;
        for (var i = 0; i < read; i++)
        {
            if (!seen[data[i]]) { seen[data[i]] = true; unique++; }
        }
        return unique / 256.0;
    }

    public static bool IsProbablyCorrupted(string path)
    {
        if (!path.EndsWith(".dwg", StringComparison.OrdinalIgnoreCase)) return false;
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            var size = stream.Length;
            if (size < MinSizeBytes) return true;

            var head = new byte[16];
            var headRead = stream.ReadAtLeast(head, 16, throwOnEndOfStream: false);
            if (!LooksLikeDwgHeader(head.AsSpan(0, headRead))) return true;

            stream.Position = 0;
            var sample = new byte[8192];
            var sampleRead = stream.ReadAtLeast(sample, sample.Length, throwOnEndOfStream: false);
            if (NonZeroRatio(sample.AsSpan(0, sampleRead)) < MinNonZeroRatio) return true;

            if (QuickEntropy(stream, size) < MinEntropyRatio) return true;
            return false;
        }
        catch
        {
            return true;
        }
    }
}

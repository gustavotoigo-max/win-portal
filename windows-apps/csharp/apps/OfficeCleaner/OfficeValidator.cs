using System.IO.Compression;
using System.IO.Hashing;
using OpenMcdf;

namespace WinPortal.Apps.OfficeCleaner;

/// <summary>
/// Mesmos critérios da versão Python: .docx/.xlsx precisam ser ZIP íntegros (CRC
/// de todas as entradas) com as partes obrigatórias; .doc/.xls precisam ser
/// arquivos OLE válidos com o fluxo principal do documento.
/// </summary>
internal static class OfficeValidator
{
    private static readonly byte[] OleSignature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];

    public static bool IsCorrupt(string path)
    {
        var lower = path.ToLowerInvariant();
        return lower.EndsWith(".docx") || lower.EndsWith(".xlsx")
            ? IsCorruptOpenXml(path, lower)
            : IsCorruptOle(path, lower);
    }

    private static bool IsCorruptOpenXml(string path, string lower)
    {
        try
        {
            using var archive = ZipFile.OpenRead(path);
            var names = new HashSet<string>(StringComparer.Ordinal);
            var buffer = new byte[81920];
            foreach (var entry in archive.Entries)
            {
                names.Add(entry.FullName);
                // Equivalente ao testzip(): lê cada entrada e confere o CRC-32.
                var crc = new Crc32();
                using var stream = entry.Open();
                int read;
                while ((read = stream.Read(buffer, 0, buffer.Length)) > 0) crc.Append(buffer.AsSpan(0, read));
                if (crc.GetCurrentHashAsUInt32() != entry.Crc32) return true;
            }

            var required = lower.EndsWith(".docx") ? "word/document.xml" : "xl/workbook.xml";
            return !names.Contains("[Content_Types].xml") || !names.Contains(required);
        }
        catch
        {
            return true;
        }
    }

    private static bool IsCorruptOle(string path, string lower)
    {
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            Span<byte> header = stackalloc byte[8];
            if (stream.ReadAtLeast(header, 8, throwOnEndOfStream: false) != 8 || !header.SequenceEqual(OleSignature))
                return true;
        }
        catch
        {
            return true;
        }

        try
        {
            using var root = RootStorage.OpenRead(path);
            string[] streams = lower.EndsWith(".doc") ? ["WordDocument"] : ["Workbook", "Book"];
            // Assim como o olefile, a busca do nome ignora maiúsculas/minúsculas.
            var names = root.EnumerateEntries().Select(entry => entry.Name).ToList();
            var match = names.FirstOrDefault(n => streams.Contains(n, StringComparer.OrdinalIgnoreCase));
            if (match is null) return true;
            using var stream = root.OpenStream(match);
            return false;
        }
        catch
        {
            return true;
        }
    }
}

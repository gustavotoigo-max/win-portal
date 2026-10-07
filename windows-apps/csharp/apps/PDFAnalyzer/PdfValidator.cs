using System.Text;
using UglyToad.PdfPig;

namespace WinPortal.Apps.PdfAnalyzer;

/// <summary>
/// Mesmo critério da versão Python (pypdf): cabeçalho %PDF-, marcador %%EOF no
/// final do arquivo e leitura da árvore de páginas sem erro.
/// </summary>
internal static class PdfValidator
{
    private const int EofSearchWindow = 1024 * 1024;

    public static bool IsCorrupt(string path)
    {
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            Span<byte> header = stackalloc byte[5];
            if (stream.ReadAtLeast(header, 5, throwOnEndOfStream: false) != 5 || !header.SequenceEqual("%PDF-"u8))
                return true;

            if (!HasEofMarker(stream)) return true;

            stream.Position = 0;
            using var document = PdfDocument.Open(stream, new ParsingOptions { UseLenientParsing = true, SkipMissingFonts = true });
            _ = document.NumberOfPages;
            return false;
        }
        catch
        {
            return true;
        }
    }

    private static bool HasEofMarker(FileStream stream)
    {
        var window = (int)Math.Min(stream.Length, EofSearchWindow);
        var buffer = new byte[window];
        stream.Position = stream.Length - window;
        stream.ReadExactly(buffer);
        return buffer.AsSpan().LastIndexOf("%%EOF"u8) >= 0;
    }
}

using System.Text;
using UglyToad.PdfPig;

namespace WinPortal.Apps.PdfAnalyzer;

/// <summary>
/// Critério da versão Python (pypdf, modo tolerante): cabeçalho %PDF-, algum
/// marcador de fim de arquivo e leitura da árvore de páginas sem erro. Como o
/// pypdf, aceita um %%EOF em qualquer ponto do arquivo ou truncado no final
/// ("%%EO"); um PDF sem nenhum marcador é rejeitado.
/// </summary>
internal static class PdfValidator
{
    private const int Block = 1024 * 1024;

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
        // Final do arquivo: marcador completo ou truncado (%%E, %%EO), ignorando espaços e nulos.
        var tailLength = (int)Math.Min(stream.Length, 64);
        var tail = new byte[tailLength];
        stream.Position = stream.Length - tailLength;
        stream.ReadExactly(tail);
        var trimmed = tail.AsSpan().TrimEnd(" \t\r\n\0"u8);
        if (trimmed.EndsWith("%%E"u8) || trimmed.EndsWith("%%EO"u8)) return true;

        // Procura %%EOF do fim para o começo, em blocos com sobreposição.
        var buffer = new byte[Block + 4];
        var end = stream.Length;
        while (end > 0)
        {
            var start = Math.Max(0, end - Block);
            var length = (int)(Math.Min(stream.Length, end + 4) - start);
            stream.Position = start;
            stream.ReadExactly(buffer, 0, length);
            if (buffer.AsSpan(0, length).IndexOf("%%EOF"u8) >= 0) return true;
            end = start;
        }
        return false;
    }
}

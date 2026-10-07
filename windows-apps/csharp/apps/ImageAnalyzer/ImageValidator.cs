using System.Buffers.Binary;
using System.IO.Hashing;
using System.Runtime.InteropServices;
using System.Windows.Media.Imaging;

namespace WinPortal.Apps.ImageAnalyzer;

/// <summary>
/// Verificação de imagens (equivalente a Image.verify() + Image.load() do Pillow):
/// a imagem precisa ser decodificada por completo, sem truncamento.
/// </summary>
internal static class ImageValidator
{
    // WINCODEC_ERR_COMPONENTNOTFOUND: não há decodificador instalado para o formato.
    private const int ComponentNotFound = unchecked((int)0x88982F50);

    public static bool IsCorrupt(string path)
    {
        byte[] data;
        try
        {
            data = File.ReadAllBytes(path);
        }
        catch
        {
            return true;
        }

        if (data.Length == 0) return true;

        var extension = Path.GetExtension(path).ToLowerInvariant();
        if (!StructureLooksValid(data, extension)) return true;

        try
        {
            Decode(data);
            return false;
        }
        catch (Exception ex) when (IsMissingCodec(ex) && extension == ".webp")
        {
            // Sem o codec WebP do Windows: aceita se o contêiner RIFF estiver íntegro.
            return !WebpContainerValid(data);
        }
        catch
        {
            return true;
        }
    }

    private static bool IsMissingCodec(Exception ex) =>
        ex is NotSupportedException ||
        (ex is COMException com && com.HResult == ComponentNotFound) ||
        (ex.InnerException is COMException inner && inner.HResult == ComponentNotFound);

    private static void Decode(byte[] data)
    {
        using var stream = new MemoryStream(data, writable: false);
        var decoder = BitmapDecoder.Create(stream,
            BitmapCreateOptions.PreservePixelFormat | BitmapCreateOptions.IgnoreColorProfile,
            BitmapCacheOption.OnLoad);
        if (decoder.Frames.Count == 0) throw new InvalidDataException("Imagem sem quadros.");

        foreach (var frame in decoder.Frames)
        {
            if (frame.PixelWidth <= 0 || frame.PixelHeight <= 0) throw new InvalidDataException("Dimensões inválidas.");
            // Força a decodificação completa dos pixels (equivalente ao load()).
            var source = new FormatConvertedBitmap(frame, System.Windows.Media.PixelFormats.Bgra32, null, 0);
            var stride = source.PixelWidth * 4;
            var rows = Math.Max(1, Math.Min(source.PixelHeight, 64 * 1024 * 1024 / Math.Max(stride, 1)));
            var buffer = new byte[stride * rows];
            for (var y = 0; y < source.PixelHeight; y += rows)
            {
                var height = Math.Min(rows, source.PixelHeight - y);
                source.CopyPixels(new System.Windows.Int32Rect(0, y, source.PixelWidth, height), buffer, stride, 0);
            }
        }
    }

    private static bool StructureLooksValid(byte[] data, string extension) => extension switch
    {
        ".png" => PngValid(data),
        ".jpg" or ".jpeg" or ".jfif" or ".jpe" => JpegComplete(data),
        _ => true,
    };

    /// <summary>Assinatura, CRC de cada bloco e presença do IEND (como o verify() do Pillow).</summary>
    private static bool PngValid(byte[] data)
    {
        ReadOnlySpan<byte> signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (data.Length < 8 || !data.AsSpan(0, 8).SequenceEqual(signature)) return false;

        var offset = 8;
        while (offset + 12 <= data.Length)
        {
            var length = BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset));
            if (length > int.MaxValue || offset + 12 + (long)length > data.Length) return false;
            var typeAndData = data.AsSpan(offset + 4, 4 + (int)length);
            var expected = BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset + 8 + (int)length));
            if (Crc32.HashToUInt32(typeAndData) != expected) return false;
            var isEnd = typeAndData[..4].SequenceEqual("IEND"u8);
            offset += 12 + (int)length;
            if (isEnd) return true;
        }
        return false;
    }

    /// <summary>JPEG truncado: o marcador EOI precisa existir depois do último SOS.</summary>
    private static bool JpegComplete(byte[] data)
    {
        if (data.Length < 4 || data[0] != 0xFF || data[1] != 0xD8) return false;
        var lastSos = -1;
        for (var i = data.Length - 2; i >= 2; i--)
        {
            if (data[i] == 0xFF && data[i + 1] == 0xDA) { lastSos = i; break; }
        }
        if (lastSos < 0) return false;
        for (var i = data.Length - 2; i > lastSos; i--)
        {
            if (data[i] == 0xFF && data[i + 1] == 0xD9) return true;
        }
        return false;
    }

    private static bool WebpContainerValid(byte[] data)
    {
        if (data.Length < 16) return false;
        if (!data.AsSpan(0, 4).SequenceEqual("RIFF"u8) || !data.AsSpan(8, 4).SequenceEqual("WEBP"u8)) return false;
        var riffSize = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(4));
        return riffSize + 8L <= data.Length && riffSize >= 8;
    }
}

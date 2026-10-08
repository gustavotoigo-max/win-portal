using System.Buffers.Binary;
using System.IO.Hashing;
using System.Runtime.InteropServices;
using System.Windows.Media.Imaging;

namespace WinPortal.Apps.ImageAnalyzer;

/// <summary>
/// Verificação de imagens (equivalente a Image.open() + verify() + load() do Pillow):
/// o formato é reconhecido pelo conteúdo, não pela extensão, e o primeiro quadro
/// precisa ser decodificado por completo, sem truncamento.
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

        // Como o Pillow, identifica o formato pelos bytes: um JPEG salvo como .png
        // é legível e não é tratado como corrompido.
        if (!StructureLooksValid(data)) return true;

        try
        {
            Decode(data);
            return false;
        }
        catch (Exception ex) when (IsMissingCodec(ex) && IsWebp(data))
        {
            // Sem o codec WebP do Windows: exige a estrutura completa da imagem
            // (blocos RIFF íntegros e um fluxo VP8/VP8L com cabeçalho e dimensões válidos).
            return !WebpStructureValid(data);
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

        // O Pillow carrega só o quadro inicial (GIF, TIFF e ICO com vários quadros).
        var frame = decoder.Frames[0];
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

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static bool StructureLooksValid(byte[] data)
    {
        if (data.Length >= 8 && data.AsSpan(0, 8).SequenceEqual(PngSignature)) return PngValid(data);
        if (data.Length >= 2 && data[0] == 0xFF && data[1] == 0xD8) return JpegComplete(data);
        return true;
    }

    private static bool IsWebp(byte[] data) =>
        data.Length >= 12 && data.AsSpan(0, 4).SequenceEqual("RIFF"u8) && data.AsSpan(8, 4).SequenceEqual("WEBP"u8);

    /// <summary>Assinatura, CRC de cada bloco e presença do IEND (como o verify() do Pillow).</summary>
    private static bool PngValid(byte[] data)
    {
        if (data.Length < 8 || !data.AsSpan(0, 8).SequenceEqual(PngSignature)) return false;

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

    /// <summary>
    /// Percorre os blocos do contêiner e exige um fluxo de imagem: VP8 (quadro-chave
    /// com o código 9D 01 2A), VP8L (assinatura 0x2F) ou ANMF/VP8X seguido de um deles.
    /// </summary>
    private static bool WebpStructureValid(byte[] data)
    {
        if (!IsWebp(data) || data.Length < 20) return false;
        var riffSize = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(4));
        if (riffSize < 12 || riffSize + 8L > data.Length) return false;
        var end = (int)(riffSize + 8);

        var offset = 12;
        var hasImage = false;
        while (offset + 8 <= end)
        {
            var size = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(offset + 4));
            if (offset + 8L + size > end) return false;
            var type = data.AsSpan(offset, 4);
            var body = data.AsSpan(offset + 8, (int)size);
            if (type.SequenceEqual("VP8 "u8))
            {
                if (!Vp8Valid(body)) return false;
                hasImage = true;
            }
            else if (type.SequenceEqual("VP8L"u8))
            {
                if (!Vp8lValid(body)) return false;
                hasImage = true;
            }
            else if (type.SequenceEqual("ANMF"u8))
            {
                // Quadro de animação: 16 bytes de cabeçalho e depois os blocos do quadro
                // (ALPH opcional, seguido de VP8 ou VP8L).
                if (!AnimationFrameValid(body)) return false;
                hasImage = true;
            }
            offset += 8 + (int)size + (int)(size & 1);
        }
        return hasImage;
    }

    private static bool AnimationFrameValid(ReadOnlySpan<byte> body)
    {
        var offset = 16;
        while (offset + 8 <= body.Length)
        {
            var size = BinaryPrimitives.ReadUInt32LittleEndian(body[(offset + 4)..]);
            if (offset + 8L + size > body.Length) return false;
            var type = body.Slice(offset, 4);
            var chunk = body.Slice(offset + 8, (int)size);
            if (type.SequenceEqual("VP8 "u8)) return Vp8Valid(chunk);
            if (type.SequenceEqual("VP8L"u8)) return Vp8lValid(chunk);
            offset += 8 + (int)size + (int)(size & 1);
        }
        return false;
    }

    private static bool Vp8Valid(ReadOnlySpan<byte> body)
    {
        if (body.Length < 10) return false;
        var keyFrame = (body[0] & 1) == 0;
        if (!keyFrame || body[3] != 0x9D || body[4] != 0x01 || body[5] != 0x2A) return false;
        var width = BinaryPrimitives.ReadUInt16LittleEndian(body[6..]) & 0x3FFF;
        var height = BinaryPrimitives.ReadUInt16LittleEndian(body[8..]) & 0x3FFF;
        var partition = (body[0] | (body[1] << 8) | (body[2] << 16)) >> 5;
        return width > 0 && height > 0 && 10 + partition <= body.Length;
    }

    private static bool Vp8lValid(ReadOnlySpan<byte> body) => body.Length >= 6 && body[0] == 0x2F && (body[4] >> 5) == 0;
}

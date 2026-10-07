using System.Buffers.Binary;
using System.Text;
using System.Text.Json;

namespace WinPortal.Apps.MySqlAnalyzer;

/// <summary>Testes heurísticos de arquivos do MySQL (mysql_analyzer/core/tool.py).</summary>
internal static class MySqlChecks
{
    private const int PageSizeInnoDb = 16 * 1024;
    private const int RedoBlock = 512;

    // Tipos válidos de página InnoDB (FIL_PAGE_TYPE), ex.: 0x45BF = índice B-Tree.
    private static readonly HashSet<int> InnoDbPageTypes =
        [0x0000, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000A, 0x000B, 0x45BF];

    /// <summary>Entropia de Shannon (0 a 8 bits/byte) dos primeiros 2 MB; -1 em erro de leitura.</summary>
    public static double ShannonEntropy(string path, int sampleBytes = 2_000_000)
    {
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            if (stream.Length == 0) return 0;
            var remaining = (int)Math.Min(stream.Length, sampleBytes);
            var counts = new long[256];
            var buffer = new byte[1024 * 1024];
            long read = 0;
            while (remaining > 0)
            {
                var n = stream.Read(buffer, 0, Math.Min(buffer.Length, remaining));
                if (n == 0) break;
                for (var i = 0; i < n; i++) counts[buffer[i]]++;
                read += n;
                remaining -= n;
            }
            if (read == 0) return 0;

            var entropy = 0.0;
            foreach (var c in counts)
            {
                if (c == 0) continue;
                var p = (double)c / read;
                entropy -= p * Math.Log2(p);
            }
            return entropy;
        }
        catch
        {
            return -1;
        }
    }

    private static (bool, string) CheckInnoDbTablespace(string path)
    {
        try
        {
            var size = new FileInfo(path).Length;
            if (size == 0 || size % PageSizeInnoDb != 0) return (false, "Tamanho não múltiplo de 16 KiB");
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            var header = new byte[26];
            if (stream.ReadAtLeast(header, 26, throwOnEndOfStream: false) < 26) return (false, "Cabeçalho curto");
            var pageType = BinaryPrimitives.ReadUInt16BigEndian(header.AsSpan(24));
            return InnoDbPageTypes.Contains(pageType) ? (true, "OK") : (false, $"Page Type inválido: 0x{pageType:X4}");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    private static (bool, string) CheckRedoLog(string path)
    {
        try
        {
            var size = new FileInfo(path).Length;
            if (size == 0 || size % RedoBlock != 0) return (false, "Tamanho não múltiplo de 512");
            if (size < 8 * 1024 * 1024) return (false, "Menor que 8 MiB (suspeito)");
            return (true, "OK");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    private static (bool, string) CheckSdi(string path)
    {
        try
        {
            var data = File.ReadAllBytes(path);
            var text = new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(data);
            if (text.StartsWith('﻿')) return (false, "SDI inválido");
            using var _ = JsonDocument.Parse(text);
            return (true, "JSON válido");
        }
        catch
        {
            return (false, "SDI inválido");
        }
    }

    private static (bool, string) CheckReadable(string path, int bytes, string ok = "Leitura OK")
    {
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            var buffer = new byte[bytes];
            _ = stream.Read(buffer, 0, bytes);
            return (true, ok);
        }
        catch
        {
            return (false, "Erro leitura");
        }
    }

    private static (bool, string) CheckFrm(string path)
    {
        try
        {
            if (new FileInfo(path).Length < 64) return (false, "Tamanho muito pequeno");
        }
        catch
        {
            return (false, "Erro leitura");
        }
        return CheckReadable(path, 512);
    }

    /// <summary>Identifica o tipo do arquivo pelo nome e aplica o teste correspondente.</summary>
    public static (bool Ok, string Detail) ClassifyAndCheck(string path)
    {
        var name = Path.GetFileName(path).ToLowerInvariant();
        if (name.EndsWith(".sdi")) return CheckSdi(path);
        if (name.StartsWith("ib_logfile") || name.StartsWith("#ib_redo")) return CheckRedoLog(path);
        if (name.EndsWith(".ibd") || name.StartsWith("ibdata") || name.StartsWith("undo_")) return CheckInnoDbTablespace(path);
        if (name.EndsWith(".frm")) return CheckFrm(path);
        if (name.EndsWith(".cfg") || name.EndsWith(".opt")) return CheckReadable(path, 256);
        return CheckReadable(path, 64);
    }
}

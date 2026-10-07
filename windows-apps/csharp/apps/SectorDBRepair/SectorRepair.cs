using System.Globalization;

namespace WinPortal.Apps.SectorDbRepair;

/// <summary>
/// Reparo por setores (sector_db_repair/core/tool.py): troca um setor marcado como
/// defeituoso pelo setor do arquivo de referência somente quando os dois setores
/// vizinhos de cada lado são idênticos nos dois arquivos.
/// </summary>
internal static class SectorRepair
{
    public static byte[] ParseHexMarker(string text)
    {
        var s = text.Trim().Replace(",", " ").Replace("\t", " ");
        var hex = string.Concat(s.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        if (hex.Length == 0 || hex.Length % 2 != 0)
            throw new FormatException("Comprimento de hex inválido.");
        try
        {
            return Convert.FromHexString(hex);
        }
        catch (FormatException)
        {
            throw new FormatException($"Marcador hexadecimal inválido: {text.Trim()}");
        }
    }

    /// <summary>Marcadores separados por ponto e vírgula, sem duplicados, na ordem informada.</summary>
    public static List<byte[]> ParseMarkers(string raw)
    {
        raw = raw.Trim();
        if (raw.Length == 0) throw new FormatException("Informe ao menos um marcador.");
        var result = new List<byte[]>();
        foreach (var part in raw.Split(';'))
        {
            if (part.Trim().Length == 0) continue;
            var marker = ParseHexMarker(part);
            if (!result.Any(m => m.AsSpan().SequenceEqual(marker))) result.Add(marker);
        }
        if (result.Count == 0) throw new FormatException("Informe ao menos um marcador.");
        return result;
    }

    public static byte[] BuildSectorPattern(byte[] marker, int sectorBytes)
    {
        if (marker.Length == 0) throw new FormatException("Marcador vazio.");
        var pattern = new byte[sectorBytes];
        for (var i = 0; i < sectorBytes; i++) pattern[i] = marker[i % marker.Length];
        return pattern;
    }

    public sealed record Summary(long TotalSectors, int BadSectors, int Replaced, int Ignored, long TailBytes);

    public static Summary Run(string damaged, string reference, string output, int sector, List<byte[]> markers,
        Action<string> log, Action<double> progress)
    {
        var patterns = markers.Select(m => BuildSectorPattern(m, sector)).ToList();
        bool MatchesMarker(ReadOnlySpan<byte> buffer)
        {
            foreach (var p in patterns)
                if (buffer.SequenceEqual(p)) return true;
            return false;
        }

        var size = new FileInfo(damaged).Length;
        var totalSectors = size / sector;
        var tail = size - totalSectors * sector;

        log("Mapeando setores defeituosos...");
        var bad = new HashSet<long>();
        var buffer = new byte[sector];
        using (var scan = new FileStream(damaged, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 20))
        {
            for (long idx = 0; idx < totalSectors; idx++)
            {
                if (scan.ReadAtLeast(buffer, sector, throwOnEndOfStream: false) < sector) break;
                if (MatchesMarker(buffer)) bad.Add(idx);
                if (idx % 10000 == 0 && idx > 0)
                    log($"[mapa] Setores escaneados: {idx.ToString("N0", CultureInfo.CurrentCulture)}/{totalSectors:N0}");
            }
        }
        log($"Setores defeituosos encontrados: {bad.Count:N0}");

        if (bad.Count == 0)
        {
            using var source = new FileStream(damaged, FileMode.Open, FileAccess.Read, FileShare.Read);
            using var target = new FileStream(output, FileMode.Create, FileAccess.Write);
            source.CopyTo(target);
            progress(100);
            log("Nenhum setor defeituoso. Arquivo copiado sem alterações.");
            return new Summary(totalSectors, 0, 0, 0, tail);
        }

        int replaced = 0, ignored = 0;
        var refBuffer = new byte[sector];
        var neighborA = new byte[sector];
        var neighborB = new byte[sector];

        using var fdan = new FileStream(damaged, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 20);
        using var fneighbor = new FileStream(damaged, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var fref = new FileStream(reference, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var fout = new FileStream(output, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 20);

        bool SectorsEqual(long idx)
        {
            fneighbor.Position = idx * sector;
            fref.Position = idx * sector;
            var a = fneighbor.ReadAtLeast(neighborA, sector, throwOnEndOfStream: false);
            var b = fref.ReadAtLeast(neighborB, sector, throwOnEndOfStream: false);
            return a == sector && b == sector && neighborA.AsSpan().SequenceEqual(neighborB);
        }

        for (long idx = 0; idx < totalSectors; idx++)
        {
            var read = fdan.ReadAtLeast(buffer, sector, throwOnEndOfStream: false);
            var current = buffer.AsSpan(0, read);

            if (bad.Contains(idx) && MatchesMarker(current))
            {
                long[] window = [idx - 2, idx - 1, idx + 1, idx + 2];
                if (window.Min() < 0 || window.Max() >= totalSectors)
                {
                    fout.Write(current);
                    ignored++;
                    log($"[ignorado] idx={idx}: sem vizinhança completa.");
                }
                else if (window.All(SectorsEqual))
                {
                    fref.Position = idx * sector;
                    var refRead = fref.ReadAtLeast(refBuffer, sector, throwOnEndOfStream: false);
                    if (refRead == sector)
                    {
                        fout.Write(refBuffer);
                        replaced++;
                        log($"[ok] idx={idx}: substituído.");
                    }
                    else
                    {
                        fout.Write(current);
                        ignored++;
                    }
                }
                else
                {
                    fout.Write(current);
                    ignored++;
                }
            }
            else
            {
                fout.Write(current);
            }

            if (idx % 1024 == 0 || idx == totalSectors - 1)
                progress((idx + 1.0) / totalSectors * 100.0);
        }

        // Bytes finais que não completam um setor são copiados sem alteração.
        if (tail > 0)
        {
            fdan.Position = totalSectors * sector;
            fdan.CopyTo(fout);
        }

        return new Summary(totalSectors, bad.Count, replaced, ignored, tail);
    }
}

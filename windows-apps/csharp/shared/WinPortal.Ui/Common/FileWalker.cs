namespace WinPortal.Ui.Common;

/// <summary>Varredura de pastas com a mesma semântica das versões Python.</summary>
public static class FileWalker
{
    private static readonly EnumerationOptions ListOptions = new()
    {
        RecurseSubdirectories = false,
        IgnoreInaccessible = true,
        AttributesToSkip = 0,
        ReturnSpecialDirectories = false,
    };

    private static bool IsLink(FileSystemInfo info) => info.Attributes.HasFlag(FileAttributes.ReparsePoint);

    /// <summary>
    /// Equivalente a os.scandir recursivo com follow_symlinks=False: ignora links,
    /// inclui arquivos ocultos e filtra por extensão (sem diferenciar maiúsculas).
    /// </summary>
    public static IEnumerable<string> SupportedFiles(string root, IReadOnlySet<string> extensions, CancellationToken token = default)
    {
        var pending = new Stack<string>();
        pending.Push(root);
        while (pending.Count > 0)
        {
            token.ThrowIfCancellationRequested();
            var current = pending.Pop();
            IEnumerable<FileSystemInfo> entries;
            try { entries = new DirectoryInfo(current).EnumerateFileSystemInfos("*", ListOptions); }
            catch { continue; }

            var buffer = new List<string>();
            try
            {
                foreach (var entry in entries)
                {
                    if (IsLink(entry)) continue;
                    if (entry is DirectoryInfo) pending.Push(entry.FullName);
                    else if (extensions.Contains(Path.GetExtension(entry.Name))) buffer.Add(entry.FullName);
                }
            }
            catch { /* pasta inacessível no meio da listagem */ }

            foreach (var file in buffer) yield return file;
        }
    }

    /// <summary>Equivalente a os.walk (topdown): todos os arquivos, sem entrar em links de pasta.</summary>
    public static IEnumerable<string> AllFiles(string root, CancellationToken token = default)
    {
        var pending = new Stack<string>();
        pending.Push(root);
        while (pending.Count > 0)
        {
            token.ThrowIfCancellationRequested();
            var current = pending.Pop();
            List<string> files = [];
            List<string> dirs = [];
            try
            {
                foreach (var entry in new DirectoryInfo(current).EnumerateFileSystemInfos("*", ListOptions))
                {
                    if (entry is DirectoryInfo) { if (!IsLink(entry)) dirs.Add(entry.FullName); }
                    else files.Add(entry.FullName);
                }
            }
            catch { continue; }

            foreach (var file in files) yield return file;
            for (var i = dirs.Count - 1; i >= 0; i--) pending.Push(dirs[i]);
        }
    }

    /// <summary>
    /// Equivalente a os.walk(topdown=False): devolve cada pasta com os nomes das
    /// subpastas, das mais profundas para a raiz. Links de pasta são listados mas
    /// não percorridos.
    /// </summary>
    public static IEnumerable<(string Directory, IReadOnlyList<string> SubdirectoryNames)> BottomUp(string root, CancellationToken token = default)
    {
        List<DirectoryInfo> subdirs;
        try
        {
            subdirs = new DirectoryInfo(root).EnumerateDirectories("*", ListOptions).ToList();
        }
        catch
        {
            yield break;
        }

        foreach (var sub in subdirs)
        {
            token.ThrowIfCancellationRequested();
            if (IsLink(sub)) continue;
            foreach (var item in BottomUp(sub.FullName, token)) yield return item;
        }

        yield return (root, subdirs.Select(d => d.Name).ToList());
    }
}

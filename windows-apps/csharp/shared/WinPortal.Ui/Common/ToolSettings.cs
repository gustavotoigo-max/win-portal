using System.Text.Json;
using System.Text.Json.Nodes;

namespace WinPortal.Ui.Common;

/// <summary>
/// Preferências de interface compartilhadas por todos os aplicativos (última pasta
/// usada em cada ferramenta). O arquivo é o mesmo para o app avulso e para a
/// Solução Completa, então a ferramenta lembra a pasta nos dois.
/// </summary>
public static class ToolSettings
{
    private static readonly object Gate = new();
    private static JsonObject? _cache;

    private static string FilePath => System.IO.Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WinPortal", "CentralScripts", "preferencias.json");

    private static JsonObject Load()
    {
        if (_cache is not null) return _cache;
        try
        {
            if (File.Exists(FilePath) && JsonNode.Parse(File.ReadAllText(FilePath)) is JsonObject obj)
                return _cache = obj;
        }
        catch
        {
            // Preferências inválidas são descartadas.
        }
        return _cache = [];
    }

    private static string? Str(JsonNode? node) => node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    /// <summary>Última pasta usada pela ferramenta, se ainda existir.</summary>
    public static string? LastFolder(string? toolId)
    {
        if (string.IsNullOrEmpty(toolId)) return null;
        lock (Gate)
        {
            var value = Str((Load()[toolId] as JsonObject)?["last_dir"]);
            return value is { Length: > 0 } && Directory.Exists(value) ? value : null;
        }
    }

    public static void RememberFolder(string? toolId, string? folder)
    {
        if (string.IsNullOrEmpty(folder)) return;
        Set(toolId, "last_dir", folder);
    }

    private static void Set(string? section, string name, string value)
    {
        if (string.IsNullOrEmpty(section)) return;
        lock (Gate)
        {
            var root = Load();
            if (root[section] is not JsonObject entry)
            {
                entry = [];
                root[section] = entry;
            }
            if (Str(entry[name]) == value) return;
            entry[name] = value;
            try
            {
                Directory.CreateDirectory(System.IO.Path.GetDirectoryName(FilePath)!);
                File.WriteAllText(FilePath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
            }
            catch
            {
                // Falha ao salvar preferências não impede o uso.
            }
        }
    }

    /// <summary>Última ferramenta aberta na Solução Completa.</summary>
    public static string? LastTool(string? key)
    {
        if (string.IsNullOrEmpty(key)) return null;
        lock (Gate) return Str((Load()[key] as JsonObject)?["last_tool"]);
    }

    public static void RememberTool(string? key, string toolId) => Set(key, "last_tool", toolId);

    /// <summary>Pasta inicial dos seletores: a do caminho informado ou a última usada.</summary>
    public static string? InitialFolder(string? toolId, string? currentPath)
    {
        if (!string.IsNullOrWhiteSpace(currentPath))
        {
            try
            {
                var path = currentPath.Trim();
                if (Directory.Exists(path)) return path;
                var parent = System.IO.Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(parent) && Directory.Exists(parent)) return parent;
            }
            catch
            {
                // Caminho digitado inválido: usa a última pasta.
            }
        }
        return LastFolder(toolId);
    }
}

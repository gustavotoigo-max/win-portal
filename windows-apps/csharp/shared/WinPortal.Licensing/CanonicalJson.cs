using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace WinPortal.Licensing;

/// <summary>
/// JSON canônico usado na assinatura Ed25519 e no arquivo de licença.
/// Reproduz byte a byte <c>json.dumps(data, sort_keys=True, separators=(",", ":"),
/// ensure_ascii=False)</c> da versão Python e o <c>canonicalJson</c> do portal
/// (lib/license-crypto.js): chaves ordenadas recursivamente, sem espaços e sem
/// escapar caracteres não ASCII.
/// </summary>
public static class CanonicalJson
{
    public static byte[] ToUtf8Bytes(JsonNode? node) => Encoding.UTF8.GetBytes(Serialize(node));

    public static string Serialize(JsonNode? node)
    {
        var builder = new StringBuilder();
        Write(builder, node);
        return builder.ToString();
    }

    private static void Write(StringBuilder sb, JsonNode? node)
    {
        switch (node)
        {
            case null:
                sb.Append("null");
                return;
            case JsonObject obj:
                sb.Append('{');
                var first = true;
                // Ordenação por unidade de código, igual a Array.prototype.sort no portal.
                foreach (var pair in obj.OrderBy(p => p.Key, StringComparer.Ordinal))
                {
                    if (!first) sb.Append(',');
                    first = false;
                    WriteString(sb, pair.Key);
                    sb.Append(':');
                    Write(sb, pair.Value);
                }
                sb.Append('}');
                return;
            case JsonArray array:
                sb.Append('[');
                for (var i = 0; i < array.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    Write(sb, array[i]);
                }
                sb.Append(']');
                return;
            case JsonValue value:
                WriteValue(sb, value);
                return;
        }
    }

    private static void WriteValue(StringBuilder sb, JsonValue value)
    {
        if (value.TryGetValue<JsonElement>(out var element))
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.String:
                    WriteString(sb, element.GetString()!);
                    return;
                case JsonValueKind.Number:
                    // Mantém a representação recebida do servidor (inteiros como "30").
                    sb.Append(element.GetRawText());
                    return;
                case JsonValueKind.True:
                    sb.Append("true");
                    return;
                case JsonValueKind.False:
                    sb.Append("false");
                    return;
                case JsonValueKind.Null:
                    sb.Append("null");
                    return;
                default:
                    Write(sb, JsonNode.Parse(element.GetRawText()));
                    return;
            }
        }

        if (value.TryGetValue<string>(out var text)) { WriteString(sb, text); return; }
        if (value.TryGetValue<bool>(out var flag)) { sb.Append(flag ? "true" : "false"); return; }
        if (value.TryGetValue<long>(out var integer)) { sb.Append(integer.ToString(CultureInfo.InvariantCulture)); return; }
        if (value.TryGetValue<int>(out var small)) { sb.Append(small.ToString(CultureInfo.InvariantCulture)); return; }
        if (value.TryGetValue<double>(out var real)) { sb.Append(real.ToString("R", CultureInfo.InvariantCulture)); return; }

        // Qualquer outro tipo: serializa e normaliza pelo caminho de JsonElement.
        Write(sb, JsonNode.Parse(value.ToJsonString()));
    }

    /// <summary>Escape de string compatível com json.dumps(ensure_ascii=False).</summary>
    private static void WriteString(StringBuilder sb, string text)
    {
        sb.Append('"');
        foreach (var ch in text)
        {
            switch (ch)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                default:
                    if (ch < 0x20)
                        sb.Append("\\u").Append(((int)ch).ToString("x4", CultureInfo.InvariantCulture));
                    else
                        sb.Append(ch);
                    break;
            }
        }
        sb.Append('"');
    }
}

/// <summary>Leitura de campos com a mesma semântica do <c>dict.get</c> do Python.</summary>
public static class JsonFields
{
    public static JsonNode? Get(this JsonObject? obj, string key) =>
        obj is not null && obj.TryGetPropertyValue(key, out var value) ? value : null;

    public static JsonObject? GetObject(this JsonObject? obj, string key) => obj.Get(key) as JsonObject;

    /// <summary>Retorna o texto somente quando o valor é uma string JSON.</summary>
    public static string? GetStringOrNull(this JsonObject? obj, string key) =>
        obj.Get(key) is JsonValue v && v.GetValueKind() == JsonValueKind.String ? v.GetValue<string>() : null;

    /// <summary>Equivalente a <c>value is True</c>.</summary>
    public static bool IsTrue(this JsonObject? obj, string key) =>
        obj.Get(key) is JsonValue v && v.GetValueKind() == JsonValueKind.True;

    /// <summary>Equivalente a <c>str(value)</c> do Python para os tipos JSON.</summary>
    public static string PyStr(this JsonNode? node)
    {
        if (node is null) return "None";
        if (node is JsonValue v)
        {
            return v.GetValueKind() switch
            {
                JsonValueKind.String => v.GetValue<string>(),
                JsonValueKind.True => "True",
                JsonValueKind.False => "False",
                JsonValueKind.Number => v.ToJsonString(),
                _ => v.ToJsonString(),
            };
        }
        return node.ToJsonString();
    }

    /// <summary>Veracidade no sentido do Python (bool(value)).</summary>
    public static bool IsTruthy(this JsonNode? node)
    {
        switch (node)
        {
            case null: return false;
            case JsonObject o: return o.Count > 0;
            case JsonArray a: return a.Count > 0;
            case JsonValue v:
                switch (v.GetValueKind())
                {
                    case JsonValueKind.True: return true;
                    case JsonValueKind.False: return false;
                    case JsonValueKind.Null: return false;
                    case JsonValueKind.String: return v.GetValue<string>().Length > 0;
                    case JsonValueKind.Number:
                        return double.TryParse(v.ToJsonString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var d) && d != 0;
                }
                return true;
        }
        return true;
    }

    /// <summary>Primeiro valor "verdadeiro" entre as chaves (operador <c>or</c> do Python).</summary>
    public static JsonNode? FirstTruthy(this JsonObject? obj, params string[] keys)
    {
        JsonNode? last = null;
        foreach (var key in keys)
        {
            last = obj.Get(key);
            if (last.IsTruthy()) return last;
        }
        return last;
    }

    /// <summary>Compara com uma string exatamente como <c>value == "texto"</c> no Python.</summary>
    public static bool EqualsString(this JsonNode? node, string expected) =>
        node is JsonValue v && v.GetValueKind() == JsonValueKind.String && v.GetValue<string>() == expected;
}

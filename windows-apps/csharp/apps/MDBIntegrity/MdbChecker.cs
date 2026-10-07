using System.Data.Odbc;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

namespace WinPortal.Apps.MdbIntegrity;

public sealed class CheckOptions
{
    public bool DeepHash { get; init; } = true;
    public bool IncludeSystemTables { get; init; }
    public bool StopOnFirstError { get; init; }
}

public sealed class CheckResult
{
    public required string Path { get; init; }
    public required string FileName { get; init; }
    public string Status { get; set; } = "ERRO";
    public bool Ok { get; set; }
    public int Tables { get; set; }
    public long Records { get; set; }
    public double Elapsed { get; set; }
    public string Detail { get; set; } = "";
    public string Driver { get; set; } = "";
    public string ContentHash { get; set; } = "";
    public string CheckedAt { get; init; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
}

/// <summary>Exceção com mensagem em português que preserva a causa ODBC original.</summary>
public sealed class CheckException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>Porta de core/tool.py (check_database e funções auxiliares).</summary>
public static class MdbChecker
{
    public static readonly string[] ValidExtensions = [".mdb", ".accdb"];
    private const int FetchBatchSize = 500;

    public static bool HasValidExtension(string path) =>
        ValidExtensions.Contains(System.IO.Path.GetExtension(path), StringComparer.OrdinalIgnoreCase);

    public static string FormatSeconds(double seconds)
    {
        var inv = CultureInfo.InvariantCulture;
        if (seconds < 1) return seconds.ToString("0.00", inv) + "s";
        var minutes = Math.Floor(seconds / 60);
        var sec = seconds - minutes * 60;
        if (minutes < 1) return sec.ToString("0.00", inv) + "s";
        var hours = Math.Floor(minutes / 60);
        minutes -= hours * 60;
        if (hours < 1) return $"{(int)minutes:00}:{sec.ToString("00.00", inv)}";
        return $"{(int)hours:00}:{(int)minutes:00}:{sec.ToString("00.00", inv)}";
    }

    public static string QuoteIdentifier(string name) => "[" + name.Replace("]", "]]") + "]";

    public static bool IsSystemTable(string name)
    {
        var upper = name.ToUpperInvariant();
        return upper.StartsWith("MSYS") || upper.StartsWith("USYS") || upper.StartsWith("~TMP") || upper.StartsWith("TMP");
    }

    /// <summary>Drivers ODBC instalados (equivalente a pyodbc.drivers()).</summary>
    public static List<string> InstalledDrivers()
    {
        var drivers = new List<string>();
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers");
            if (key is not null)
                foreach (var name in key.GetValueNames())
                    if (string.Equals(key.GetValue(name) as string, "Installed", StringComparison.OrdinalIgnoreCase))
                        drivers.Add(name);
        }
        catch
        {
            // Sem acesso ao registro: segue sem drivers.
        }
        return drivers;
    }

    public static string? FindAccessDriver()
    {
        var drivers = InstalledDrivers();
        string[] preferred =
        [
            "Microsoft Access Driver (*.mdb, *.accdb)",
            "Microsoft Access Driver (*.mdb)",
            "Driver do Microsoft Access (*.mdb, *.accdb)",
            "Driver do Microsoft Access (*.mdb)",
        ];
        foreach (var wanted in preferred)
            foreach (var driver in drivers)
                if (string.Equals(driver.Trim(), wanted, StringComparison.OrdinalIgnoreCase))
                    return driver;

        foreach (var driver in drivers)
        {
            var low = driver.ToLowerInvariant();
            if (low.Contains("access") && (low.Contains("mdb") || low.Contains("accdb")))
                return driver;
        }
        return null;
    }

    public static CheckResult Check(string path, CheckOptions options, CancellationToken cancel,
        Action<string>? log = null, Action<string, long, long>? tableProgress = null)
    {
        var watch = System.Diagnostics.Stopwatch.StartNew();
        var result = new CheckResult { Path = path, FileName = System.IO.Path.GetFileName(path) };

        try
        {
            if (!File.Exists(path))
            {
                if (Directory.Exists(path)) throw new CheckException("O caminho selecionado não é um arquivo.");
                throw new CheckException("Arquivo não encontrado.");
            }
            if (!HasValidExtension(path))
                throw new CheckException("Extensão inválida. Use arquivos .mdb ou .accdb.");

            var driver = FindAccessDriver();
            if (driver is null)
            {
                var available = InstalledDrivers();
                throw new CheckException(
                    "Nenhum driver ODBC do Microsoft Access foi encontrado.\n\n" +
                    "Drivers encontrados:\n" +
                    (available.Count > 0 ? string.Join(", ", available) : "nenhum driver encontrado") + "\n\n" +
                    "Instale o Microsoft Access Database Engine de 64 bits, ou use uma máquina " +
                    "que já tenha Office/Access com driver ODBC.");
            }
            result.Driver = driver;

            log?.Invoke($"Abrindo: {path}");
            log?.Invoke($"Driver ODBC: {driver}");

            var connectionString = $"DRIVER={{{driver}}};DBQ={path};READONLY=TRUE;";
            using var connection = new OdbcConnection(connectionString) { ConnectionTimeout = 10 };
            try
            {
                connection.Open();
            }
            catch (Exception ex)
            {
                throw new CheckException($"Falha ao abrir conexão ODBC com o banco: {ex.Message}", ex);
            }

            log?.Invoke("Lendo catálogo de tabelas...");
            var tables = new List<string>();
            try
            {
                var schema = connection.GetSchema("Tables");
                foreach (System.Data.DataRow row in schema.Rows)
                {
                    if (!string.Equals(row["TABLE_TYPE"]?.ToString(), "TABLE", StringComparison.OrdinalIgnoreCase)) continue;
                    var name = row["TABLE_NAME"]?.ToString() ?? "";
                    if (!options.IncludeSystemTables && IsSystemTable(name)) continue;
                    tables.Add(name);
                }
            }
            catch (Exception ex)
            {
                throw new CheckException($"Erro ao listar tabelas no catálogo do banco: {ex.Message}", ex);
            }

            result.Tables = tables.Count;
            if (tables.Count == 0)
            {
                log?.Invoke("Nenhuma tabela de usuário encontrada. Banco abriu corretamente.");
                result.Status = "OK";
                result.Ok = true;
                result.Detail = "Banco abriu corretamente, mas nenhuma tabela de usuário foi encontrada.";
                return result;
            }

            using var sha = options.DeepHash ? IncrementalHash.CreateHash(HashAlgorithmName.SHA256) : null;
            long totalRecords = 0;

            for (var index = 0; index < tables.Count; index++)
            {
                var table = tables[index];
                if (cancel.IsCancellationRequested) throw new CheckException("Verificação cancelada pelo usuário.");

                var tableSql = QuoteIdentifier(table);
                log?.Invoke($"Tabela {index + 1}/{tables.Count}: {table}");

                long expected;
                try
                {
                    using var countCommand = new OdbcCommand($"SELECT COUNT(*) FROM {tableSql}", connection);
                    var value = countCommand.ExecuteScalar();
                    expected = value is null or DBNull ? 0 : Convert.ToInt64(value, CultureInfo.InvariantCulture);
                }
                catch (Exception ex)
                {
                    throw new CheckException($"Erro ao executar COUNT(*) na tabela '{table}': {ex.Message}", ex);
                }

                log?.Invoke($"Registros esperados: {expected}");

                long read = 0;
                try
                {
                    using var command = new OdbcCommand($"SELECT * FROM {tableSql}", connection);
                    using var reader = command.ExecuteReader();
                    var columns = Enumerable.Range(0, reader.FieldCount).Select(reader.GetName).ToArray();
                    sha?.AppendData(Encoding.UTF8.GetBytes($"TABLE:{table}\n"));
                    sha?.AppendData(Encoding.UTF8.GetBytes("COLUMNS:" + string.Join("|", columns) + "\n"));

                    var values = new object[reader.FieldCount];
                    var builder = new StringBuilder();
                    while (reader.Read())
                    {
                        // Lê todos os campos para forçar o acesso aos dados de cada registro.
                        reader.GetValues(values);
                        read++;

                        if (sha is not null)
                        {
                            builder.Clear();
                            AppendRecord(builder, values);
                            sha.AppendData(Encoding.UTF8.GetBytes(builder.ToString()));
                        }

                        if (read % FetchBatchSize == 0)
                        {
                            if (cancel.IsCancellationRequested) throw new CheckException("Verificação cancelada pelo usuário.");
                            tableProgress?.Invoke(table, read, expected);
                        }
                    }
                    tableProgress?.Invoke(table, read, expected);
                }
                catch (CheckException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    throw new CheckException(
                        $"Erro ao ler todos os registros da tabela '{table}'. Lidos {read} de {expected}. Detalhe: {ex.Message}", ex);
                }

                if (read != expected)
                    throw new CheckException(
                        $"Divergência na tabela '{table}': COUNT(*) informou {expected}, mas foram lidos {read} registros.");

                totalRecords += read;
                result.Records = totalRecords;
                log?.Invoke($"OK: {table} ({read} registros lidos)");
            }

            result.Records = totalRecords;
            result.ContentHash = sha is null ? "" : Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant();
            result.Status = "OK";
            result.Ok = true;
            result.Detail = $"Banco funcional. {result.Tables} tabela(s) e {result.Records} registro(s) lidos integralmente sem erro.";
            if (result.ContentHash.Length > 0) result.Detail += $"\nSHA-256 da leitura: {result.ContentHash}";
        }
        catch (Exception ex)
        {
            result.Status = "ERRO";
            result.Ok = false;
            result.Detail = FormatErrorDetail(ex, path, result);
        }
        finally
        {
            result.Elapsed = watch.Elapsed.TotalSeconds;
        }
        return result;
    }

    /// <summary>Representação estável de um registro para o hash da leitura.</summary>
    private static void AppendRecord(StringBuilder sb, object[] values)
    {
        sb.Append('(');
        for (var i = 0; i < values.Length; i++)
        {
            if (i > 0) sb.Append(", ");
            switch (values[i])
            {
                case DBNull: sb.Append("None"); break;
                case string s: sb.Append(JsonSerializer.Serialize(s)); break;
                case byte[] bytes: sb.Append("b'").Append(Convert.ToHexString(bytes)).Append('\''); break;
                case DateTime dt: sb.Append(dt.ToString("yyyy-MM-ddTHH:mm:ss.fffffff", CultureInfo.InvariantCulture)); break;
                case bool b: sb.Append(b ? "True" : "False"); break;
                case IFormattable f: sb.Append(f.ToString(null, CultureInfo.InvariantCulture)); break;
                case var other: sb.Append(other); break;
            }
        }
        sb.Append(")\n");
    }

    private static List<Exception> ExceptionChain(Exception ex)
    {
        var chain = new List<Exception>();
        for (Exception? current = ex; current is not null; current = current.InnerException) chain.Add(current);
        return chain;
    }

    public static string DetectErrorStage(string summary)
    {
        var text = summary.ToLowerInvariant();
        if (text.Contains("driver odbc")) return "Driver ODBC";
        if (text.Contains("abrir conexão") || text.Contains("conexão odbc")) return "Abertura do banco";
        if (text.Contains("catálogo") || text.Contains("listar tabelas")) return "Leitura do catálogo de tabelas";
        if (text.Contains("count(*)")) return "Contagem de registros";
        if (text.Contains("ler todos os registros")) return "Leitura de registros";
        if (text.Contains("divergência")) return "Conferência de quantidade";
        if (text.Contains("cancelada")) return "Cancelamento";
        return "Verificação geral";
    }

    public static List<string> BuildErrorSuggestions(string summary, IEnumerable<Exception> chain)
    {
        var text = string.Join(" ", chain.Select(e => e.Message)).ToLowerInvariant();
        var lowSummary = summary.ToLowerInvariant();
        var suggestions = new List<string>();

        if (text.Contains("driver odbc") || text.Contains("data source name not found") || text.Contains("im002"))
            suggestions.Add("Confirme se o Microsoft Access Database Engine de 64 bits está instalado (o aplicativo é 64 bits).");
        if (text.Contains("not a valid password") || text.Contains("senha") || text.Contains("password"))
            suggestions.Add("O banco pode estar protegido por senha; esta verificação abre apenas bancos sem senha.");
        if (text.Contains("unrecognized database format") || text.Contains("formato") || text.Contains("3343"))
            suggestions.Add("O arquivo pode estar corrompido, ser de uma versão/formato não suportado pelo driver, ou não ser um MDB/ACCDB válido.");
        if (text.Contains("could not use") || text.Contains("already in use") || text.Contains("em uso"))
            suggestions.Add("Feche o arquivo no Access ou em outros sistemas antes de verificar novamente.");
        if (text.Contains("no read permission") || text.Contains("permission") || text.Contains("permiss") || text.Contains("acesso negado"))
            suggestions.Add("Verifique permissões de leitura na pasta e no arquivo.");
        if (lowSummary.Contains("count(*)") || lowSummary.Contains("ler todos os registros"))
            suggestions.Add("Uma tabela específica falhou; tente reparar/compactar o banco no Access e repetir a verificação.");
        if (suggestions.Count == 0)
            suggestions.Add("Consulte os detalhes técnicos abaixo; eles preservam a mensagem ODBC original para diagnóstico.");
        return suggestions;
    }

    public static string FormatErrorDetail(Exception ex, string path, CheckResult result)
    {
        var chain = ExceptionChain(ex);
        var summary = string.IsNullOrWhiteSpace(ex.Message) ? ex.GetType().Name : ex.Message.Trim();
        var root = chain[^1];

        var lines = new List<string>
        {
            $"Resumo: {summary}",
            "",
            "Contexto:",
            $"- Arquivo: {path}",
            $"- Etapa: {DetectErrorStage(summary)}",
            $"- Driver: {(result.Driver.Length > 0 ? result.Driver : "-")}",
            $"- Tabelas identificadas: {result.Tables}",
            $"- Registros lidos antes do erro: {result.Records}",
        };

        if (chain.Count > 1)
        {
            lines.AddRange(["", "Causa original:", $"- Tipo: {root.GetType().Name}", $"- Mensagem: {root.Message}"]);
            if (root is OdbcException odbc)
                foreach (OdbcError error in odbc.Errors)
                    lines.Add($"- ODBC [{error.SQLState}] {error.NativeError}: {error.Message}");
        }

        lines.Add("");
        lines.Add("Possíveis causas/ações:");
        lines.AddRange(BuildErrorSuggestions(summary, chain).Select(s => $"- {s}"));

        if (ex is not CheckException || chain.Count > 1)
        {
            lines.Add("");
            lines.Add("Detalhes técnicos:");
            lines.Add(ex.ToString());
        }
        return string.Join("\n", lines);
    }
}

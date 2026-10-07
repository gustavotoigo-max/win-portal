using System.Text;
using System.Windows;
using WinPortal.Ui.Shell;

namespace WinPortal.Ui.Common;

/// <summary>"Exportar relatório" padrão: CSV com ponto e vírgula (abre direto no Excel em português).</summary>
public static class ReportExport
{
    public static string Csv(IEnumerable<string> fields) => string.Join(";", fields.Select(f =>
        f.IndexOfAny([';', '"', '\n', '\r']) >= 0 ? "\"" + f.Replace("\"", "\"\"") + "\"" : f));

    /// <summary>Pergunta onde salvar e grava as linhas. Retorna o caminho salvo.</summary>
    public static string? SaveCsv(DependencyObject owner, string toolId, string baseName,
        IReadOnlyList<string> header, IEnumerable<IReadOnlyList<string>> rows)
    {
        var window = Window.GetWindow(owner);
        var path = Pickers.SaveFile(window, "Exportar relatório", "CSV (*.csv)|*.csv|Todos os arquivos (*.*)|*.*",
            $"{baseName}_{DateTime.Now:yyyyMMdd_HHmmss}.csv", ToolSettings.LastFolder(toolId), ".csv");
        if (path is null) return null;

        try
        {
            var sb = new StringBuilder();
            sb.AppendLine(Csv(header));
            foreach (var row in rows) sb.AppendLine(Csv(row));
            File.WriteAllText(path, sb.ToString(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
            ToolSettings.RememberFolder(toolId, System.IO.Path.GetDirectoryName(path));
            Saved(window, path);
            return path;
        }
        catch (Exception ex)
        {
            MessageDialog.Error(window, "Erro ao exportar", ex.Message);
            return null;
        }
    }

    /// <summary>Exporta um texto (log) como .txt.</summary>
    public static string? SaveText(DependencyObject owner, string toolId, string baseName, string content)
    {
        var window = Window.GetWindow(owner);
        var path = Pickers.SaveFile(window, "Exportar relatório", "Texto (*.txt)|*.txt|Todos os arquivos (*.*)|*.*",
            $"{baseName}_{DateTime.Now:yyyyMMdd_HHmmss}.txt", ToolSettings.LastFolder(toolId), ".txt");
        if (path is null) return null;

        try
        {
            File.WriteAllText(path, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
            ToolSettings.RememberFolder(toolId, System.IO.Path.GetDirectoryName(path));
            Saved(window, path);
            return path;
        }
        catch (Exception ex)
        {
            MessageDialog.Error(window, "Erro ao exportar", ex.Message);
            return null;
        }
    }

    /// <summary>Mensagem padrão de arquivo salvo, com a opção de abrir a pasta.</summary>
    public static void Saved(Window? owner, string path)
    {
        if (MessageDialog.Confirm(owner, "Relatório salvo", $"Relatório salvo em:\n{path}", yes: "Abrir pasta", no: "Fechar"))
            Browser.ShowInExplorer(path);
    }

    public static void NothingToExport(DependencyObject owner) =>
        MessageDialog.Info(Window.GetWindow(owner), "Sem resultados", "Ainda não há resultados para exportar.");
}

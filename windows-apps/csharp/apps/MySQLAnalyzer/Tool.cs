namespace WinPortal.Apps.MySqlAnalyzer;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "mysql_analyzer",
        Name: "MySQL Analyzer",
        Category: ToolCategories.Databases,
        Summary: "Arquivos do MySQL (datadir)",
        Create: () => new MySqlView());
}

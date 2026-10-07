namespace WinPortal.Apps.FirebirdAnalyzer;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "firebird_analyzer",
        Name: "Firebird Analyzer",
        Category: ToolCategories.Databases,
        Summary: "Validação de bancos Firebird",
        Create: () => new FirebirdView());
}

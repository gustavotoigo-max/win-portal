namespace WinPortal.Apps.MdbIntegrity;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "mdb_integrity",
        Name: "MDB Integrity",
        Category: ToolCategories.Databases,
        Summary: "Bancos Microsoft Access",
        Create: () => new MdbView());
}

namespace WinPortal.Apps.SectorDbRepair;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "sector_db_repair",
        Name: "Sector DB Repair",
        Category: ToolCategories.Databases,
        Summary: "Reparo de bancos por setores",
        Create: () => new SectorRepairView());
}

namespace WinPortal.Apps.SectorDbRepair;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Sector DB Repair",
            AppSlug: "sector_db_repair",
            ExecutableName: "SectorDBRepair",
            Software: "SectorDBFBRepair",
            ProductId: "sector-dbfb-repair"),
        Tagline: "Reparo de bancos e arquivos por setores");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

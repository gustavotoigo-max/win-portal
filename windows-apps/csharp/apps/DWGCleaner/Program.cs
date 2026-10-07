namespace WinPortal.Apps.DwgCleaner;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "DWG Cleaner",
            AppSlug: "dwg_cleaner",
            ExecutableName: "DWGCleaner",
            Software: "DWGCleaner",
            ProductId: "dwg-cleaner"),
        Tagline: "Organização de arquivos CAD");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

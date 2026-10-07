namespace WinPortal.Apps.OfficeCleaner;

internal static class Program
{
    // O produto é vendido no portal como "Solução Completa" (complete-solution).
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Office Cleaner",
            AppSlug: "office_cleaner",
            ExecutableName: "OfficeCleaner",
            Software: "SolucaoCompleta",
            ProductId: "complete-solution"),
        Tagline: "Diagnóstico de documentos Word e Excel");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

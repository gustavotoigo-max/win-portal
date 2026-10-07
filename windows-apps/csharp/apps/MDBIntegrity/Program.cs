namespace WinPortal.Apps.MdbIntegrity;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "MDB Integrity",
            AppSlug: "mdb_integrity",
            ExecutableName: "MDBIntegrity",
            Software: "MDBIntegrity",
            ProductId: "mdb-integrity"),
        Tagline: "Verificação profunda de bancos Microsoft Access")
    {
        WindowWidth = 1180,
        WindowHeight = 760,
        WindowMinWidth = 980,
        WindowMinHeight = 620,
    };

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

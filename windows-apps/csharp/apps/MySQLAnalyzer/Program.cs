namespace WinPortal.Apps.MySqlAnalyzer;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "MySQL Analyzer",
            AppSlug: "mysql_analyzer",
            ExecutableName: "MySQLAnalyzer",
            Software: "MySQLAnalyzer",
            ProductId: "mysql-analyzer"),
        Tagline: "Diagnóstico de bancos de dados MySQL");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

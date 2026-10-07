namespace WinPortal.Apps.FirebirdAnalyzer;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Firebird Analyzer",
            AppSlug: "firebird_analyzer",
            ExecutableName: "FirebirdAnalyzer",
            Software: "FirebirdAnalyzer",
            ProductId: "firebird-analyzer"),
        Tagline: "Diagnóstico de bancos de dados Firebird");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, () => new FirebirdView());
}

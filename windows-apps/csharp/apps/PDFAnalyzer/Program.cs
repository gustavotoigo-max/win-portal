namespace WinPortal.Apps.PdfAnalyzer;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "PDF Analyzer",
            AppSlug: "pdf_analyzer",
            ExecutableName: "PDFAnalyzer",
            Software: "PDFAnalyzer",
            ProductId: "pdf-analyzer"),
        Tagline: "Recuperação e diagnóstico de documentos PDF");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

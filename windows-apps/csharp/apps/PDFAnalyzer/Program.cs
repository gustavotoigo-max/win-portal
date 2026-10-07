using WinPortal.Ui.Tools;

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
    private static int Main() => WinPortalApp.Run(Product, () => new CorruptedFileAnalyzerView(new AnalyzerOptions
    {
        Title = "Analisador de PDFs corrompidos",
        Subtitle = "Abre cada PDF da pasta, confere a estrutura e as páginas e remove os arquivos danificados.",
        Extensions = [".pdf"],
        FolderDialogTitle = "Selecione a pasta com os PDFs",
        EmptyMessage = "Nenhum arquivo PDF encontrado.",
        IsCorruptFile = PdfValidator.IsCorrupt,
    }));
}

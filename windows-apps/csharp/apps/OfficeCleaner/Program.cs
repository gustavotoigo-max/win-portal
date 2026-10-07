using WinPortal.Ui.Tools;

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
    private static int Main() => WinPortalApp.Run(Product, () => new CorruptedFileAnalyzerView(new AnalyzerOptions
    {
        Title = "Analisador de arquivos Office corrompidos",
        Subtitle = "Verifica documentos .doc, .docx, .xls e .xlsx e remove os arquivos que não abrem mais.",
        Extensions = [".doc", ".docx", ".xls", ".xlsx"],
        FolderDialogTitle = "Selecione a pasta com os arquivos Office",
        EmptyMessage = "Nenhum arquivo Office suportado foi encontrado.",
        IsCorruptFile = OfficeValidator.IsCorrupt,
    }));
}

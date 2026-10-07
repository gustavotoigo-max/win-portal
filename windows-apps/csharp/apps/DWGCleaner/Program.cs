using WinPortal.Ui.Tools;

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
    private static int Main() => WinPortalApp.Run(Product, () => new CorruptedFileAnalyzerView(new AnalyzerOptions
    {
        Title = "Verificar e apagar DWGs corrompidos",
        Subtitle = "Confere cabeçalho, tamanho mínimo e conteúdo de cada desenho .dwg e remove os arquivos danificados.",
        Extensions = [".dwg"],
        FolderDialogTitle = "Selecione a pasta com os DWGs",
        EmptyMessage = "Nenhum arquivo .dwg encontrado.",
        IsCorruptFile = DwgValidator.IsProbablyCorrupted,
    }));
}

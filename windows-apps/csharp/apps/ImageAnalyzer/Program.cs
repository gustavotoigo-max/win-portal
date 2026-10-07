using WinPortal.Ui.Tools;

namespace WinPortal.Apps.ImageAnalyzer;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Image Analyzer",
            AppSlug: "image_analyzer",
            ExecutableName: "ImageAnalyzer",
            Software: "ImageAnalyzer",
            ProductId: "image-analyzer"),
        Tagline: "Recuperação e diagnóstico de imagens");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, () => new CorruptedFileAnalyzerView(new AnalyzerOptions
    {
        Title = "Analisador de imagens corrompidas",
        Subtitle = "Verifica JPG, PNG, BMP, GIF, TIFF, WebP e ICO e remove os arquivos que não abrem mais.",
        Extensions = [".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif", ".webp", ".ico", ".jfif", ".jpe"],
        FolderDialogTitle = "Selecione a pasta com as imagens",
        EmptyMessage = "Nenhuma imagem encontrada.",
        IsCorruptFile = ImageValidator.IsCorrupt,
    }));
}

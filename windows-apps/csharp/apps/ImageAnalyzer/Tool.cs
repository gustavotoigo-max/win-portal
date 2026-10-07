using WinPortal.Ui.Tools;

namespace WinPortal.Apps.ImageAnalyzer;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "image_analyzer",
        Name: "Image Analyzer",
        Category: ToolCategories.Recovery,
        Summary: "Imagens corrompidas",
        Create: () => new CorruptedFileAnalyzerView(new AnalyzerOptions
        {
            ToolId = "image_analyzer",
            Title = "Analisador de imagens corrompidas",
            Subtitle = "Verifica JPG, PNG, BMP, GIF, TIFF, WebP e ICO e remove os arquivos que não abrem mais.",
            Extensions = [".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif", ".webp", ".ico", ".jfif", ".jpe"],
            FolderDialogTitle = "Selecione a pasta com as imagens",
            EmptyMessage = "Nenhuma imagem encontrada.",
            IsCorruptFile = ImageValidator.IsCorrupt,
        }));
}

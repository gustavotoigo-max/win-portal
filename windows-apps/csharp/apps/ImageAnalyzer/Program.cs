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
    private static int Main() => WinPortalApp.Run(Product, Tool.Descriptor.Create);
}

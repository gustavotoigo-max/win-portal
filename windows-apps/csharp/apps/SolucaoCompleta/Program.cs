using WinPortal.Ui.Tools;

namespace WinPortal.Apps.SolucaoCompleta;

internal static class Program
{
    // Mesmo produto do portal (complete-solution): a chave da Solução Completa ativa este aplicativo.
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Solução Completa",
            AppSlug: "solucao_completa",
            ExecutableName: "SolucaoCompleta",
            Software: "SolucaoCompleta",
            ProductId: "complete-solution"),
        Tagline: "Todas as ferramentas Nexotool em um só aplicativo")
    {
        WindowWidth = 1380,
        WindowHeight = 860,
        WindowMinWidth = 1180,
        WindowMinHeight = 700,
    };

    public static readonly ToolDescriptor[] Tools =
    [
        WinPortal.Apps.ImageAnalyzer.Tool.Descriptor,
        WinPortal.Apps.PdfAnalyzer.Tool.Descriptor,
        WinPortal.Apps.OfficeCleaner.Tool.Descriptor,
        WinPortal.Apps.FirebirdAnalyzer.Tool.Descriptor,
        WinPortal.Apps.MySqlAnalyzer.Tool.Descriptor,
        WinPortal.Apps.MdbIntegrity.Tool.Descriptor,
        WinPortal.Apps.SectorDbRepair.Tool.Descriptor,
        WinPortal.Apps.DwgCleaner.Tool.Descriptor,
        WinPortal.Apps.RenameFolder.Tool.Descriptor,
        WinPortal.Apps.EmptyFolders.Tool.Descriptor,
    ];

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, () => new ToolSuiteView(Tools, "solucao_completa"));
}

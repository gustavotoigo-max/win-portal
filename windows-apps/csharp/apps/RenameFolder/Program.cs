namespace WinPortal.Apps.RenameFolder;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Rename Folder",
            AppSlug: "rename_folder",
            ExecutableName: "RenameFolder",
            Software: "RenameFolder",
            ProductId: "rename-folder"),
        Tagline: "Organização de pastas em lote");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, () => new RenameFolderView());
}

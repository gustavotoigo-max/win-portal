namespace WinPortal.Apps.EmptyFolders;

internal static class Program
{
    public static readonly ProductInfo Product = new(
        new ProductIdentity(
            AppName: "Empty Folders",
            AppSlug: "empty_folders",
            ExecutableName: "EmptyFolders",
            Software: "EmptyFolderCleaner",
            ProductId: "empty-folder-cleaner"),
        Tagline: "Organização de pastas");

    [STAThread]
    private static int Main() => WinPortalApp.Run(Product, () => new EmptyFoldersView());
}

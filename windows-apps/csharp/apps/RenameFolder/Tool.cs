namespace WinPortal.Apps.RenameFolder;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "rename_folder",
        Name: "Rename Folder",
        Category: ToolCategories.Organization,
        Summary: "Renomear pastas em lote",
        Create: () => new RenameFolderView());
}

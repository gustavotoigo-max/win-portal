namespace WinPortal.Apps.EmptyFolders;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "empty_folders",
        Name: "Empty Folders",
        Category: ToolCategories.Organization,
        Summary: "Pastas vazias",
        Create: () => new EmptyFoldersView());
}

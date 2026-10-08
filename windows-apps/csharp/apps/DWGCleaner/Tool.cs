using WinPortal.Ui.Tools;

namespace WinPortal.Apps.DwgCleaner;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "dwg_cleaner",
        Name: "DWG Cleaner",
        Category: ToolCategories.Organization,
        Summary: "Desenhos DWG corrompidos",
        Create: () => new CorruptedFileAnalyzerView(new AnalyzerOptions
        {
            ToolId = "dwg_cleaner",
            Title = "Analisador de DWGs corrompidos",
            Subtitle = "Confere cabeçalho, tamanho mínimo e conteúdo de cada desenho .dwg e lista os danificados. Nada é apagado sem você clicar em Apagar e confirmar.",
            Extensions = [".dwg"],
            FolderDialogTitle = "Selecione a pasta com os DWGs",
            EmptyMessage = "Nenhum arquivo .dwg encontrado.",
            IsCorruptFile = DwgValidator.IsProbablyCorrupted,
        }));
}

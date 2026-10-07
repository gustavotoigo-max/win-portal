using WinPortal.Ui.Tools;

namespace WinPortal.Apps.OfficeCleaner;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "office_cleaner",
        Name: "Office Cleaner",
        Category: ToolCategories.Recovery,
        Summary: "Word e Excel corrompidos",
        Create: () => new CorruptedFileAnalyzerView(new AnalyzerOptions
        {
            ToolId = "office_cleaner",
            Title = "Analisador de arquivos Office corrompidos",
            Subtitle = "Verifica documentos .doc, .docx, .xls e .xlsx e remove os arquivos que não abrem mais.",
            Extensions = [".doc", ".docx", ".xls", ".xlsx"],
            FolderDialogTitle = "Selecione a pasta com os arquivos Office",
            EmptyMessage = "Nenhum arquivo Office suportado foi encontrado.",
            IsCorruptFile = OfficeValidator.IsCorrupt,
        }));
}

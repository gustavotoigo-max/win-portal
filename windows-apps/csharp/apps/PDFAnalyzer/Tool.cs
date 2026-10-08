using WinPortal.Ui.Tools;

namespace WinPortal.Apps.PdfAnalyzer;

/// <summary>Ferramenta usada pelo app avulso e pela Solução Completa.</summary>
internal static class Tool
{
    public static readonly ToolDescriptor Descriptor = new(
        Id: "pdf_analyzer",
        Name: "PDF Analyzer",
        Category: ToolCategories.Recovery,
        Summary: "PDFs corrompidos",
        Create: () => new CorruptedFileAnalyzerView(new AnalyzerOptions
        {
            ToolId = "pdf_analyzer",
            Title = "Analisador de PDFs corrompidos",
            Subtitle = "Abre cada PDF da pasta, confere a estrutura e as páginas e lista os danificados. Nada é apagado sem você clicar em Apagar e confirmar.",
            Extensions = [".pdf"],
            FolderDialogTitle = "Selecione a pasta com os PDFs",
            EmptyMessage = "Nenhum arquivo PDF encontrado.",
            IsCorruptFile = PdfValidator.IsCorrupt,
        }));
}

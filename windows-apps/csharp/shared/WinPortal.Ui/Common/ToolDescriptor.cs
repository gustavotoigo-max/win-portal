using System.Windows;

namespace WinPortal.Ui.Common;

/// <summary>Ferramenta que pode ser aberta pelo app avulso ou pela Solução Completa.</summary>
/// <param name="Id">Identificador estável (igual ao slug do app avulso).</param>
/// <param name="Category">Categoria exibida na navegação, igual à do site.</param>
public sealed record ToolDescriptor(string Id, string Name, string Category, string Summary, Func<FrameworkElement> Create);

public static class ToolCategories
{
    public const string Recovery = "Recuperação de arquivos";
    public const string Databases = "Bancos de dados";
    public const string Organization = "Organização";

    public static readonly string[] Order = [Recovery, Databases, Organization];
}

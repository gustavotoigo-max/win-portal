using System.Windows;
using System.Windows.Media;
using Microsoft.Win32;

namespace WinPortal.Ui.Common;

public enum ThemeMode { Auto, Light, Dark }

/// <summary>
/// Tema claro/escuro. "Automático" segue a configuração do Windows (modo dos
/// aplicativos). O tema é aplicado ao abrir; trocar exige reiniciar o aplicativo.
/// </summary>
public static class ThemeManager
{
    private const string Section = "interface";

    // Paleta escura: mesmos nomes de Theme.xaml. Cabeçalho, rodapé e log continuam azul-marinho.
    private static readonly Dictionary<string, string> DarkPalette = new()
    {
        ["AppBackgroundBrush"] = "#0A1222",
        ["SurfaceBrush"] = "#111B2E",
        ["SurfaceAltBrush"] = "#16223A",
        ["BorderBrush"] = "#24324E",
        ["BorderStrongBrush"] = "#33456A",
        ["BorderHoverBrush"] = "#4E6390",
        ["TextBrush"] = "#E6ECF5",
        ["TextMutedBrush"] = "#A9B5C9",
        ["TextSubtleBrush"] = "#8090A8",
        ["DisabledBrush"] = "#5D6B84",
        ["DisabledFillBrush"] = "#1C2840",
        ["BlueSoftBrush"] = "#14294F",
        ["BlueSelectionBrush"] = "#1D3B72",
        ["BlueBrush"] = "#3B82F6",
        ["SuccessBrush"] = "#22C55E",
        ["SuccessSoftBrush"] = "#0F3324",
        ["SuccessTextBrush"] = "#86EFAC",
        ["SuccessBorderBrush"] = "#166534",
        ["DangerBrush"] = "#F87171",
        ["DangerSoftBrush"] = "#3F1619",
        ["DangerTextBrush"] = "#FCA5A5",
        ["DangerBorderBrush"] = "#7F1D1D",
        ["WarningBrush"] = "#FBBF24",
        ["WarningSoftBrush"] = "#3A2A0B",
        ["WarningTextBrush"] = "#FCD34D",
        ["ScrollThumbBrush"] = "#4E6390",
    };

    public static ThemeMode Mode
    {
        get => ToolSettings.Get(Section, "theme") switch
        {
            "light" => ThemeMode.Light,
            "dark" => ThemeMode.Dark,
            _ => ThemeMode.Auto,
        };
        set => ToolSettings.Set(Section, "theme", value switch
        {
            ThemeMode.Light => "light",
            ThemeMode.Dark => "dark",
            _ => "auto",
        });
    }

    /// <summary>Tema efetivamente aplicado nesta execução.</summary>
    public static bool IsDark { get; private set; }

    /// <summary>Windows em modo escuro para aplicativos (Configurações &gt; Personalização &gt; Cores).</summary>
    public static bool WindowsPrefersDark()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            return key?.GetValue("AppsUseLightTheme") is int light && light == 0;
        }
        catch
        {
            return false;
        }
    }

    public static bool ResolveDark(ThemeMode mode) => mode switch
    {
        ThemeMode.Dark => true,
        ThemeMode.Light => false,
        _ => WindowsPrefersDark(),
    };

    /// <summary>Troca as cores do dicionário de tema antes de qualquer janela ser criada.</summary>
    public static void Apply(ResourceDictionary theme)
    {
        IsDark = ResolveDark(Mode);
        if (!IsDark) return;
        foreach (var (key, hex) in DarkPalette)
        {
            var brush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
            brush.Freeze();
            theme[key] = brush;
        }
    }
}

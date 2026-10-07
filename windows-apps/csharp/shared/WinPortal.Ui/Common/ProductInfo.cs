using System.Reflection;
using System.Windows.Media.Imaging;
using WinPortal.Licensing;

namespace WinPortal.Ui.Common;

/// <summary>Configuração de cada aplicativo (equivalente ao project_config.py).</summary>
public sealed record ProductInfo(ProductIdentity Identity, string Tagline)
{
    public double WindowWidth { get; init; } = 1100;
    public double WindowHeight { get; init; } = 750;
    public double WindowMinWidth { get; init; } = 900;
    public double WindowMinHeight { get; init; } = 650;

    public string AppName => Identity.AppName;
    public string Version => Identity.SoftwareVersion;

    private static string AssemblyName =>
        (Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly()).GetName().Name!;

    public Uri LogoUri => new($"pack://application:,,,/{AssemblyName};component/Assets/logo.png");
    public Uri IconUri => new($"pack://application:,,,/{AssemblyName};component/Assets/app.ico");

    public BitmapSource? LoadLogo() => TryLoad(LogoUri);
    /// <summary>
    /// Ícone da janela com todos os tamanhos do .ico. Um BitmapImage pegaria só o primeiro
    /// quadro (16 px), e o Windows ampliava esse quadro na barra de tarefas.
    /// </summary>
    public BitmapSource? LoadIcon()
    {
        try
        {
            return BitmapFrame.Create(IconUri, BitmapCreateOptions.None, BitmapCacheOption.OnLoad);
        }
        catch
        {
            return null;
        }
    }

    private static BitmapSource? TryLoad(Uri uri)
    {
        try
        {
            var image = new BitmapImage();
            image.BeginInit();
            image.UriSource = uri;
            image.CacheOption = BitmapCacheOption.OnLoad;
            image.EndInit();
            image.Freeze();
            return image;
        }
        catch
        {
            return null;
        }
    }
}

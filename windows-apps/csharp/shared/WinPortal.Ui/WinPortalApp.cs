using System.Globalization;
using System.Windows;
using System.Windows.Markup;
using System.Windows.Threading;
using WinPortal.Ui.Common;
using WinPortal.Ui.Shell;

namespace WinPortal.Ui;

/// <summary>Ponto de entrada comum: tema, idioma, tratamento de erros e janela principal.</summary>
public static class WinPortalApp
{
    public static int Run(ProductInfo product, Func<FrameworkElement> createTool)
    {
        var culture = CultureInfo.GetCultureInfo("pt-BR");
        CultureInfo.DefaultThreadCurrentCulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;
        Thread.CurrentThread.CurrentCulture = culture;
        Thread.CurrentThread.CurrentUICulture = culture;
        FrameworkElement.LanguageProperty.OverrideMetadata(
            typeof(FrameworkElement), new FrameworkPropertyMetadata(XmlLanguage.GetLanguage(culture.IetfLanguageTag)));

        var app = new Application { ShutdownMode = ShutdownMode.OnMainWindowClose };
        app.Resources.MergedDictionaries.Add(new ResourceDictionary
        {
            Source = new Uri("pack://application:,,,/WinPortal.Ui;component/Themes/Theme.xaml"),
        });

        app.DispatcherUnhandledException += (_, e) =>
        {
            e.Handled = true;
            MessageDialog.Error(app.MainWindow, "Erro", $"Falha inesperada:\n{e.Exception.Message}");
        };

        var shell = new ShellWindow(product, createTool);
        app.MainWindow = shell;
        return app.Run(shell);
    }

    /// <summary>Executa uma ação na thread da interface.</summary>
    public static void OnUi(Action action)
    {
        var dispatcher = Application.Current?.Dispatcher;
        if (dispatcher is null || dispatcher.CheckAccess()) action();
        else dispatcher.BeginInvoke(action, DispatcherPriority.Normal);
    }
}

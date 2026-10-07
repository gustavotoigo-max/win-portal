using System.Diagnostics;

namespace WinPortal.Licensing;

/// <summary>
/// Ponto único de debug do fluxo de licença (equivalente a activation/debug.py).
/// Desligado por padrão; ligue com a variável de ambiente WINPORTAL_DEBUG=1.
/// </summary>
public static class Diagnostics
{
    public static bool Enabled { get; set; } =
        Environment.GetEnvironmentVariable("WINPORTAL_DEBUG") == "1";

    public static event Action<string>? MessageLogged;

    public static void LogStep(string message)
    {
        if (!Enabled) return;
        var line = $"{DateTimeOffset.UtcNow:yyyy-MM-ddTHH:mm:ss+00:00} | {message}";
        Debug.WriteLine(line);
        try { MessageLogged?.Invoke(line); }
        catch { /* Debug não deve quebrar o fluxo principal. */ }
    }
}

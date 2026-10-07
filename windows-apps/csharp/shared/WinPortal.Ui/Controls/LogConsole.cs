using System.Collections.Concurrent;
using System.Text;
using System.Windows.Controls;
using System.Windows.Threading;

namespace WinPortal.Ui.Controls;

/// <summary>
/// Caixa de log padrão (fundo azul-marinho, fonte monoespaçada). Pode receber
/// linhas de qualquer thread; as atualizações são agrupadas para não travar a tela.
/// </summary>
public class LogConsole : TextBox
{
    private const int MaxCharacters = 2_000_000;
    private readonly ConcurrentQueue<string> _pending = new();
    private readonly DispatcherTimer _timer;

    public LogConsole()
    {
        SetResourceReference(StyleProperty, "LogTextBox");
        _timer = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(80) };
        _timer.Tick += (_, _) => Flush();
        _timer.Start();
        Unloaded += (_, _) => Flush();
    }

    /// <summary>Adiciona uma linha (seguro entre threads).</summary>
    public void AppendLine(string line) => _pending.Enqueue(line);

    public void Clear(bool discardPending)
    {
        if (discardPending) _pending.Clear();
        base.Clear();
    }

    public new void Clear() => Clear(discardPending: true);

    public bool IsEmpty => Text.Length == 0 && _pending.IsEmpty;

    public void Flush()
    {
        if (_pending.IsEmpty) return;
        var builder = new StringBuilder();
        while (_pending.TryDequeue(out var line)) builder.Append(line).Append('\n');

        if (Text.Length + builder.Length > MaxCharacters)
        {
            var keep = Text.Length / 2;
            Text = "… (linhas antigas removidas)\n" + Text[^keep..];
        }

        AppendText(builder.ToString());
        ScrollToEnd();
    }
}

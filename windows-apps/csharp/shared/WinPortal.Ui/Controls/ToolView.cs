using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Ui.Controls;

/// <summary>Ferramenta que pode estar em execução (usado pela janela e pela Solução Completa).</summary>
public interface IToolView
{
    bool IsBusy { get; }
    event EventHandler? BusyChanged;
    void RequestCancel();
}

/// <summary>
/// Base das telas de ferramenta: controla o estado de execução e o cancelamento,
/// do mesmo jeito em todas.
/// </summary>
public class ToolView : UserControl, IToolView
{
    private CancellationTokenSource? _cts;

    public bool IsBusy { get; private set; }
    public event EventHandler? BusyChanged;

    public ToolView()
    {
        // Os rótulos dos campos desta tela dividem a mesma largura de coluna (PathField).
        Grid.SetIsSharedSizeScope(this, true);
    }

    protected Window? Owner => Window.GetWindow(this);

    /// <summary>Marca a ferramenta como ocupada e devolve o token de cancelamento.</summary>
    protected CancellationToken BeginWork()
    {
        _cts = new CancellationTokenSource();
        if (!IsBusy)
        {
            IsBusy = true;
            OnBusyChanged(true);
            BusyChanged?.Invoke(this, EventArgs.Empty);
        }
        return _cts.Token;
    }

    protected void EndWork()
    {
        if (!IsBusy) return;
        IsBusy = false;
        OnBusyChanged(false);
        BusyChanged?.Invoke(this, EventArgs.Empty);
    }

    protected bool CancelRequested => _cts?.IsCancellationRequested == true;

    /// <summary>Habilita/desabilita os campos conforme o estado.</summary>
    protected virtual void OnBusyChanged(bool busy) { }

    public virtual void RequestCancel() => _cts?.Cancel();
}

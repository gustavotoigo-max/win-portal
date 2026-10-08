using System.Windows;

namespace WinPortal.Apps.SectorDbRepair;

public partial class SectorRepairView : ToolView
{
    private const string ToolId = "sector_db_repair";

    public SectorRepairView()
    {
        InitializeComponent();
        ResultsCard.ShowPlaceholder(true);
    }

    private void OnInputChanged(object? sender, EventArgs e) =>
        Actions.CanStart = Damaged.Text.Length > 0 && Reference.Text.Length > 0 && Output.Text.Length > 0;

    /// <summary>Sugere a saída ao lado do original: nome_reconstruido.ext</summary>
    private void OnDamagedPicked(object? sender, EventArgs e)
    {
        var path = Damaged.Text;
        var directory = Path.GetDirectoryName(path) ?? "";
        Output.Text = Path.Combine(directory, Path.GetFileNameWithoutExtension(path) + "_reconstruido" + Path.GetExtension(path));
    }

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        RequestCancel();
        Progress.Working("Cancelando...");
    }

    private async void OnRepair(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        var damaged = Damaged.Text;
        var reference = Reference.Text;
        var output = Output.Text;

        if (!int.TryParse(SectorBox.Text.Trim(), out var sector) || sector <= 0)
        {
            MessageDialog.Error(Owner, "Erro", "Tamanho de setor inválido.");
            return;
        }
        if (damaged.Length == 0 || !File.Exists(damaged))
        {
            MessageDialog.Error(Owner, "Erro", "Arquivo danificado inválido.");
            return;
        }
        if (reference.Length == 0 || !File.Exists(reference))
        {
            MessageDialog.Error(Owner, "Erro", "Arquivo de referência inválido.");
            return;
        }
        if (output.Length == 0)
        {
            MessageDialog.Error(Owner, "Erro", "Informe onde salvar o arquivo reconstruído.");
            return;
        }
        if (string.Equals(Path.GetFullPath(output), Path.GetFullPath(damaged), StringComparison.OrdinalIgnoreCase) ||
            string.Equals(Path.GetFullPath(output), Path.GetFullPath(reference), StringComparison.OrdinalIgnoreCase))
        {
            MessageDialog.Error(Owner, "Erro", "A saída precisa ser um arquivo diferente do danificado e da referência.");
            return;
        }

        List<byte[]> markers;
        try
        {
            markers = SectorRepair.ParseMarkers(MarkersBox.Text);
        }
        catch (Exception ex)
        {
            MessageDialog.Error(Owner, "Erro nos marcadores", ex.Message);
            return;
        }

        if (File.Exists(output) && !MessageDialog.Confirm(Owner, "Confirmar substituição",
                $"O arquivo de saída já existe:\n{output}\n\nDeseja substituí-lo?", yes: "Substituir", no: "Cancelar", destructive: true))
            return;

        Log.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(false);
        var token = BeginWork();
        Progress.Working("Reparando...", 0);

        // A gravação vai para um arquivo temporário desta execução. A saída escolhida
        // só é substituída depois do sucesso: cancelar ou falhar nunca apaga um
        // arquivo que já existia.
        var partial = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(output)) ?? "",
            $".{Path.GetFileName(output)}.{Guid.NewGuid():N}.parcial");
        SectorRepair.Summary? summary = null;
        Exception? failure = null;
        var lastProgress = 0L;
        await Task.Run(() =>
        {
            try
            {
                summary = SectorRepair.Run(damaged, reference, partial, sector, markers, Log.AppendLine, value =>
                {
                    if (Environment.TickCount64 - lastProgress < 50 && value < 100) return;
                    lastProgress = Environment.TickCount64;
                    Dispatcher.BeginInvoke(() => { if (!CancelRequested) Progress.Working($"Reparando... {value:0}%", value / 100.0); });
                }, token);
                File.Move(partial, output, overwrite: true);
            }
            catch (Exception ex)
            {
                failure = ex;
                // Remove somente o temporário criado nesta execução.
                try { if (File.Exists(partial)) File.Delete(partial); } catch { }
            }
        });

        EndWork();
        if (failure is OperationCanceledException)
        {
            Log.AppendLine("*** Operação cancelada pelo usuário. Nenhum arquivo foi gravado ou alterado. ***");
            Progress.Cancelled("Cancelado · nenhum arquivo foi gerado ou alterado.");
            return;
        }
        if (failure is not null)
        {
            Progress.Failed("Falha durante o reparo.");
            MessageDialog.Error(Owner, "Erro", failure.Message);
            return;
        }

        var s = summary!;
        if (s.BadSectors > 0)
        {
            Log.AppendLine("Concluído.");
            Log.AppendLine($"Total setores: {s.TotalSectors:N0}, defeituosos: {s.BadSectors:N0}, substituídos: {s.Replaced:N0}, ignorados: {s.Ignored:N0}");
        }
        if (s.TailBytes > 0)
            Log.AppendLine($"{s.TailBytes:N0} byte(s) finais (setor incompleto) copiados sem alteração.");
        Log.AppendLine($"Arquivo salvo em: {output}");
        ResultsCard.Summary = $"{s.Replaced:N0} setor(es) substituído(s)";
        var text = $"Setores: {s.TotalSectors:N0} · Defeituosos: {s.BadSectors:N0} · Substituídos: {s.Replaced:N0} · Ignorados: {s.Ignored:N0}";
        if (s.Ignored > 0) Progress.Warn($"Concluído · {text}");
        else Progress.Done($"Concluído · {text}");
        if (MessageDialog.Confirm(Owner, "Reparo concluído", $"{text.Replace(" · ", "\n")}\n\nArquivo salvo em:\n{output}",
                yes: "Abrir pasta", no: "Fechar"))
            Browser.ShowInExplorer(output);
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        Log.Clear();
        ResultsCard.Summary = "";
        ResultsCard.ShowPlaceholder(true);
        Progress.Ready("Selecione o arquivo danificado e a referência e clique em Reparar arquivo.");
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        Log.Flush();
        if (Log.Text.Length == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        ReportExport.SaveText(this, ToolId, "relatorio_reparo", Log.Text);
    }

    protected override void OnBusyChanged(bool busy)
    {
        Damaged.IsEnabled = Reference.IsEnabled = Output.IsEnabled = SectorBox.IsEnabled = MarkersBox.IsEnabled = !busy;
        Actions.IsBusy = busy;
        ResultsCard.SetBusy(busy);
    }
}

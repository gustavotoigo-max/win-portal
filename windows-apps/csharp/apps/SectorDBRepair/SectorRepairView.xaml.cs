using System.Windows;
using System.Windows.Controls;

namespace WinPortal.Apps.SectorDbRepair;

public partial class SectorRepairView : UserControl
{
    public SectorRepairView()
    {
        InitializeComponent();
    }

    private Window? Owner => Window.GetWindow(this);

    private void OnSelectDamaged(object sender, RoutedEventArgs e)
    {
        var path = Pickers.File(Owner, "Selecione o arquivo danificado");
        if (path is null) return;
        DamagedBox.Text = path;
        // Sugere a saída ao lado do original: nome_reconstruido.ext
        var directory = Path.GetDirectoryName(path) ?? "";
        OutputBox.Text = Path.Combine(directory, Path.GetFileNameWithoutExtension(path) + "_reconstruido" + Path.GetExtension(path));
    }

    private void OnSelectReference(object sender, RoutedEventArgs e)
    {
        var path = Pickers.File(Owner, "Selecione o arquivo de referência");
        if (path is not null) ReferenceBox.Text = path;
    }

    private void OnSelectOutput(object sender, RoutedEventArgs e)
    {
        var current = OutputBox.Text.Trim();
        var path = Pickers.SaveFile(Owner, "Salvar arquivo reconstruído",
            fileName: current.Length > 0 ? Path.GetFileName(current) : null,
            initial: current.Length > 0 ? Path.GetDirectoryName(current) : null);
        if (path is not null) OutputBox.Text = path;
    }

    private async void OnRepair(object sender, RoutedEventArgs e)
    {
        var damaged = DamagedBox.Text.Trim();
        var reference = ReferenceBox.Text.Trim();
        var output = OutputBox.Text.Trim();

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
            MessageDialog.Error(Owner, "Erro", "Informe o caminho de saída.");
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

        Log.Clear();
        Progress.Value = 0;
        RepairButton.IsEnabled = false;
        StatusText.Text = "Reparando...";

        SectorRepair.Summary? summary = null;
        Exception? failure = null;
        var lastProgress = 0L;
        await Task.Run(() =>
        {
            try
            {
                summary = SectorRepair.Run(damaged, reference, output, sector, markers, Log.AppendLine, value =>
                {
                    if (Environment.TickCount64 - lastProgress < 50 && value < 100) return;
                    lastProgress = Environment.TickCount64;
                    Dispatcher.BeginInvoke(() => Progress.Value = value / 100.0);
                });
            }
            catch (Exception ex)
            {
                failure = ex;
            }
        });

        RepairButton.IsEnabled = true;
        if (failure is not null)
        {
            StatusText.Text = "Falha durante o reparo.";
            MessageDialog.Error(Owner, "Erro", failure.Message);
            return;
        }

        var s = summary!;
        Progress.Value = 1;
        if (s.BadSectors > 0)
        {
            Log.AppendLine("Concluído.");
            Log.AppendLine($"Total setores: {s.TotalSectors:N0}, defeituosos: {s.BadSectors:N0}, substituídos: {s.Replaced:N0}, ignorados: {s.Ignored:N0}");
        }
        if (s.TailBytes > 0)
            Log.AppendLine($"{s.TailBytes:N0} byte(s) finais (setor incompleto) copiados sem alteração.");
        StatusText.Text = $"Concluído · Setores: {s.TotalSectors:N0} · Defeituosos: {s.BadSectors:N0} · Substituídos: {s.Replaced:N0} · Ignorados: {s.Ignored:N0}";
        MessageDialog.Success(Owner, "Concluído", "Reparo finalizado.");
    }
}

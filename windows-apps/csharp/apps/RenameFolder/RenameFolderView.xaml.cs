using System.Windows;

namespace WinPortal.Apps.RenameFolder;

/// <summary>
/// Renomeação recursiva (rename_folder/core/tool.py). A varredura é de baixo para
/// cima (os.walk topdown=False): as subpastas mais profundas são renomeadas antes
/// das pastas-mãe, preservando os caminhos durante o processo. Antes de renomear,
/// a lista completa é calculada e exibida para confirmação.
/// </summary>
public partial class RenameFolderView : ToolView
{
    private const string ToolId = "rename_folder";

    private sealed record Rename(string OldPath, string NewPath)
    {
        public string Outcome { get; set; } = "Pendente";
    }

    private List<Rename> _plan = [];

    public RenameFolderView()
    {
        InitializeComponent();
        ResultsCard.ShowPlaceholder(true);
    }

    private void OnInputChanged(object? sender, EventArgs e) =>
        Actions.CanStart = Folder.Text.Length > 0 && TermBox.Text.Trim().Length > 0 && NewNameBox.Text.Trim().Length > 0;

    private void OnCancel(object sender, RoutedEventArgs e)
    {
        RequestCancel();
        Progress.Working("Cancelando... aguarde a etapa atual terminar.");
    }

    private async void OnStart(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        var root = Folder.Text;
        var term = TermBox.Text.Trim();
        var newBase = NewNameBox.Text.Trim();

        if (root.Length == 0 || term.Length == 0 || newBase.Length == 0)
        {
            MessageDialog.Warning(Owner, "Aviso", "Preencha todos os campos.");
            return;
        }
        if (!Directory.Exists(root))
        {
            MessageDialog.Error(Owner, "Erro", "Selecione uma pasta válida.");
            return;
        }
        if (newBase.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            MessageDialog.Error(Owner, "Erro", "O novo nome contém caracteres que não são permitidos em nomes de pasta.");
            return;
        }

        ToolSettings.RememberFolder(ToolId, root);
        ShowPlan([]);
        var token = BeginWork();
        Progress.Working("Procurando pastas...");

        List<Rename> plan;
        try
        {
            plan = await Task.Run(() => BuildPlan(root, term, newBase, token), token);
        }
        catch (OperationCanceledException)
        {
            EndWork();
            Progress.Cancelled("Cancelado · busca interrompida.");
            return;
        }
        catch (Exception ex)
        {
            EndWork();
            Progress.Failed("Falha ao listar as pastas.");
            MessageDialog.Error(Owner, "Erro", ex.Message);
            return;
        }

        ShowPlan(plan);
        if (plan.Count == 0)
        {
            EndWork();
            Progress.Done("Concluído · nenhuma pasta contém o termo informado.");
            MessageDialog.Success(Owner, "Busca concluída", "Nenhuma pasta com o termo informado foi encontrada.");
            return;
        }

        Progress.Warn($"{plan.Count:N0} pasta(s) para renomear. Confira a lista.");
        if (!MessageDialog.Confirm(Owner, "Confirmar renomeação",
                $"{plan.Count:N0} pasta(s) serão renomeadas, conforme a lista na tela.\n\nDeseja continuar?",
                yes: "Renomear", no: "Cancelar", destructive: true))
        {
            EndWork();
            Progress.Warn($"Concluído · {plan.Count:N0} pasta(s) listada(s), nada foi renomeado");
            return;
        }

        token = BeginWork();
        var (renamed, failed, cancelled) = await Task.Run(() => Execute(plan, token));
        EndWork();
        ShowPlan(plan);

        var summary = $"{renamed:N0} pasta(s) renomeada(s) · {failed:N0} falha(s)";
        if (cancelled)
        {
            Progress.Cancelled($"Cancelado · {summary}");
            return;
        }
        if (failed > 0)
        {
            Progress.Warn($"Concluído com falhas · {summary}");
            MessageDialog.Warning(Owner, "Concluído com falhas", $"{renamed:N0} pasta(s) renomeada(s).\n{failed:N0} não puderam ser renomeadas (veja a lista).");
            return;
        }
        Progress.Done($"Concluído · {summary}");
        MessageDialog.Success(Owner, "Concluído", $"{renamed:N0} pasta(s) renomeada(s).");
    }

    /// <summary>
    /// Calcula os novos nomes exatamente como a versão original faria renomeando
    /// uma a uma: numeração global e, em cada pasta, pulando nomes já ocupados.
    /// </summary>
    private static List<Rename> BuildPlan(string root, string term, string newBase, CancellationToken token)
    {
        var plan = new List<Rename>();
        var occupied = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        HashSet<string> Names(string directory)
        {
            if (!occupied.TryGetValue(directory, out var names))
            {
                names = new HashSet<string>(Directory.EnumerateFileSystemEntries(directory).Select(Path.GetFileName)!,
                    StringComparer.OrdinalIgnoreCase);
                occupied[directory] = names;
            }
            return names;
        }

        var counter = 1;
        foreach (var (directory, names) in FileWalker.BottomUp(root))
        {
            token.ThrowIfCancellationRequested();
            foreach (var name in names)
            {
                if (!name.Contains(term, StringComparison.Ordinal)) continue;

                var taken = Names(directory);
                var newName = $"{newBase} ({counter})";
                // Evita colisão com nomes já existentes (no disco ou já renomeados).
                while (taken.Contains(newName))
                {
                    counter++;
                    newName = $"{newBase} ({counter})";
                }

                taken.Remove(name);
                taken.Add(newName);
                plan.Add(new Rename(Path.Combine(directory, name), Path.Combine(directory, newName)));
                counter++;
            }
        }
        return plan;
    }

    private (int Renamed, int Failed, bool Cancelled) Execute(List<Rename> plan, CancellationToken token)
    {
        int renamed = 0, failed = 0;
        var lastReport = 0L;
        for (var i = 0; i < plan.Count; i++)
        {
            if (token.IsCancellationRequested) break;
            var item = plan[i];
            try
            {
                if (Directory.Exists(item.NewPath) || File.Exists(item.NewPath))
                    throw new IOException("já existe um item com o novo nome.");
                Directory.Move(item.OldPath, item.NewPath);
                item.Outcome = "Renomeada";
                renamed++;
            }
            catch (Exception ex)
            {
                item.Outcome = $"Falha: {ex.Message}";
                failed++;
            }

            if (Environment.TickCount64 - lastReport > 50 || i == plan.Count - 1)
            {
                lastReport = Environment.TickCount64;
                var (done, r, f) = (i + 1, renamed, failed);
                Dispatcher.BeginInvoke(() =>
                {
                    if (!CancelRequested)
                        Progress.Working($"Renomeando {done:N0}/{plan.Count:N0} · {r:N0} renomeada(s) · {f:N0} falha(s)", (double)done / plan.Count);
                });
            }
        }
        foreach (var item in plan.Where(p => p.Outcome == "Pendente")) item.Outcome = "Não renomeada (cancelado)";
        return (renamed, failed, token.IsCancellationRequested);
    }

    private void ShowPlan(List<Rename> plan)
    {
        _plan = plan;
        Log.Clear();
        foreach (var item in plan)
        {
            var prefix = item.Outcome switch
            {
                "Pendente" => "",
                "Renomeada" => "OK: ",
                _ when item.Outcome.StartsWith("Falha", StringComparison.Ordinal) => "FALHA: ",
                _ => "NÃO RENOMEADA: ",
            };
            var suffix = item.Outcome.StartsWith("Falha", StringComparison.Ordinal) ? $" ({item.Outcome[7..]})" : "";
            Log.AppendLine($"{prefix}{item.OldPath} -> {Path.GetFileName(item.NewPath)}{suffix}");
        }
        ResultsCard.Summary = plan.Count > 0 ? $"{plan.Count:N0} pasta(s)" : "";
        ResultsCard.ShowPlaceholder(plan.Count == 0);
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (IsBusy) return;
        ShowPlan([]);
        Progress.Ready("Informe a pasta, o termo e o novo nome e clique em Renomear pastas.");
    }

    private void OnExport(object sender, RoutedEventArgs e)
    {
        if (_plan.Count == 0)
        {
            ReportExport.NothingToExport(this);
            return;
        }
        ReportExport.SaveCsv(this, ToolId, "pastas_renomeadas", ["pasta_original", "novo_caminho", "situacao"],
            _plan.Select(p => (IReadOnlyList<string>)[p.OldPath, p.NewPath, p.Outcome]));
    }

    protected override void OnBusyChanged(bool busy)
    {
        Folder.IsEnabled = TermBox.IsEnabled = NewNameBox.IsEnabled = !busy;
        Actions.IsBusy = busy;
        ResultsCard.SetBusy(busy);
    }
}

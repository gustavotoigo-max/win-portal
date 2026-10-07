using System.Windows;
using System.Windows.Controls;
using WinPortal.Ui.Common;

namespace WinPortal.Ui.Controls;

public enum PathKind
{
    /// <summary>Uma pasta (as ferramentas varrem as subpastas).</summary>
    Folder,
    /// <summary>Um arquivo existente.</summary>
    File,
    /// <summary>Uma pasta ou um único arquivo.</summary>
    FolderOrFile,
    /// <summary>Arquivo a ser criado.</summary>
    SaveFile,
}

/// <summary>
/// Campo de caminho padrão de todas as ferramentas: rótulo, caixa de texto e o botão
/// "Selecionar pasta…"/"Selecionar arquivo…". Aceita arrastar e soltar e lembra a última
/// pasta usada em cada ferramenta.
/// </summary>
public class PathField : Grid
{
    private readonly TextBlock _label = new();
    private readonly TextBox _box = new();
    private readonly StackPanel _buttons = new() { Orientation = Orientation.Horizontal, Margin = new Thickness(12, 0, 0, 0) };
    private PathKind _kind = PathKind.Folder;

    public PathField()
    {
        Margin = new Thickness(0, 0, 0, 12);
        Background = System.Windows.Media.Brushes.Transparent;
        AllowDrop = true;
        ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(LabelWidth) });
        ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        _label.SetResourceReference(StyleProperty, "FieldLabelText");
        SetColumn(_box, 1);
        SetColumn(_buttons, 2);
        Children.Add(_label);
        Children.Add(_box);
        Children.Add(_buttons);

        _box.TextChanged += (_, _) => TextChanged?.Invoke(this, EventArgs.Empty);
        PreviewDragEnter += OnDragOver;
        PreviewDragOver += OnDragOver;
        PreviewDrop += OnDrop;
        BuildButtons();
    }

    /// <summary>Largura da coluna de rótulos, igual em todos os formulários.</summary>
    public const double LabelWidth = 150;

    public event EventHandler? TextChanged;

    /// <summary>Disparado quando o caminho muda por seleção ou arrastar e soltar (não por digitação).</summary>
    public event EventHandler? PathPicked;

    public string Label
    {
        get => _label.Text;
        set => _label.Text = value;
    }

    public PathKind Kind
    {
        get => _kind;
        set
        {
            _kind = value;
            BuildButtons();
        }
    }

    /// <summary>Filtro dos seletores de arquivo.</summary>
    public string Filter { get; set; } = "Todos os arquivos (*.*)|*.*";

    public string? DialogTitle { get; set; }

    /// <summary>Identificador da ferramenta, usado para lembrar a última pasta.</summary>
    public string? ToolId { get; set; }

    public string Hint
    {
        get => _box.ToolTip as string ?? "";
        set => _box.ToolTip = value;
    }

    public string Text
    {
        get => _box.Text.Trim();
        set => _box.Text = value;
    }

    public TextBox Box => _box;

    private void BuildButtons()
    {
        _buttons.Children.Clear();
        switch (_kind)
        {
            case PathKind.Folder:
                AddButton("Selecionar pasta…", PickFolder);
                break;
            case PathKind.File:
                AddButton("Selecionar arquivo…", PickFile);
                break;
            case PathKind.FolderOrFile:
                AddButton("Selecionar pasta…", PickFolder);
                AddButton("Selecionar arquivo…", PickFile);
                break;
            case PathKind.SaveFile:
                AddButton("Salvar como…", PickSave);
                break;
        }
        if (string.IsNullOrEmpty(Hint))
            _box.ToolTip = _kind switch
            {
                PathKind.Folder => "Digite o caminho, clique em Selecionar pasta ou arraste uma pasta para cá.",
                PathKind.File => "Digite o caminho, clique em Selecionar arquivo ou arraste um arquivo para cá.",
                PathKind.FolderOrFile => "Digite o caminho, use os botões ou arraste uma pasta ou um arquivo para cá.",
                _ => "Digite o caminho ou clique em Salvar como.",
            };
    }

    private void AddButton(string text, Action action)
    {
        var button = new Button { Content = text };
        if (_buttons.Children.Count > 0) button.Margin = new Thickness(8, 0, 0, 0);
        button.Click += (_, _) => action();
        _buttons.Children.Add(button);
    }

    private Window? OwnerWindow => Window.GetWindow(this);
    private string? Initial => ToolSettings.InitialFolder(ToolId, Text);

    private void PickFolder()
    {
        var folder = Pickers.Folder(OwnerWindow, DialogTitle ?? "Selecione a pasta", Initial);
        if (folder is not null) Apply(folder, folder);
    }

    private void PickFile()
    {
        var file = Pickers.File(OwnerWindow, DialogTitle ?? "Selecione o arquivo", Filter, Initial);
        if (file is not null) Apply(file, System.IO.Path.GetDirectoryName(file));
    }

    private void PickSave()
    {
        var current = Text;
        string? name = null;
        try { name = current.Length > 0 ? System.IO.Path.GetFileName(current) : null; }
        catch { /* caminho digitado inválido */ }
        var file = Pickers.SaveFile(OwnerWindow, DialogTitle ?? "Salvar como", Filter, name, Initial);
        if (file is not null) Apply(file, System.IO.Path.GetDirectoryName(file));
    }

    private void Apply(string path, string? folderToRemember)
    {
        Text = path;
        ToolSettings.RememberFolder(ToolId, folderToRemember);
        _box.CaretIndex = _box.Text.Length;
        PathPicked?.Invoke(this, EventArgs.Empty);
    }

    private string? Accept(DragEventArgs e)
    {
        if (!IsEnabled || _kind == PathKind.SaveFile) return null;
        if (e.Data.GetData(DataFormats.FileDrop) is not string[] { Length: > 0 } dropped) return null;
        var path = dropped[0];
        return _kind switch
        {
            // Um arquivo solto num campo de pasta seleciona a pasta onde ele está.
            PathKind.Folder => Directory.Exists(path) ? path : System.IO.File.Exists(path) ? System.IO.Path.GetDirectoryName(path) : null,
            PathKind.File => System.IO.File.Exists(path) ? path : null,
            _ => Directory.Exists(path) || System.IO.File.Exists(path) ? path : null,
        };
    }

    private void OnDragOver(object sender, DragEventArgs e)
    {
        e.Effects = Accept(e) is not null ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    private void OnDrop(object sender, DragEventArgs e)
    {
        e.Handled = true;
        var path = Accept(e);
        if (path is null) return;
        Apply(path, Directory.Exists(path) ? path : System.IO.Path.GetDirectoryName(path));
    }
}

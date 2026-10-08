# Aplicativos Nexotool em C# (.NET 8 / WPF)

Tradução dos 10 aplicativos Python da pasta `aplicativos` para C#, com a identidade
visual nova do site (azul `#2563EB`, ciano `#22D3EE` nos detalhes, cabeçalho e rodapé
em azul-marinho) e os ícones de `assets/product-icons-v1`. Os originais em Python não
foram alterados.

Além dos 10 aplicativos avulsos há a **Solução Completa** (`SolucaoCompleta.exe`), que
reúne todas as ferramentas numa só janela, com navegação lateral agrupada como no site.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `shared/WinPortal.Licensing` | Ativação e revalidação com o portal (mesmo contrato da versão Python) |
| `shared/WinPortal.Ui` | Tema, janela principal (cabeçalho, rodapé, selo da licença), tela de ativação, diálogos e componentes comuns |
| `apps/<Nome>` | Um projeto por aplicativo, só com a lógica e a tela da ferramenta (`Tool.cs` descreve a ferramenta) |
| `apps/SolucaoCompleta` | Solução Completa: usa os mesmos arquivos das ferramentas (links no `.csproj`, sem cópia) |
| `installer/<Nome>.iss` | Script do Inno Setup de cada aplicativo, com imagens do assistente em `installer/branding` |
| `tests/` | Testes de compatibilidade da licença contra a versão Python e o portal |

| Produto | Executável | Licença no cliente |
|---|---|---|
| Image Analyzer | `ImageAnalyzer.exe` | `%LOCALAPPDATA%\WinPortal\CentralScripts\image_analyzer\license.dat` |
| PDF Analyzer | `PDFAnalyzer.exe` | `...\pdf_analyzer\license.dat` |
| Firebird Analyzer | `FirebirdAnalyzer.exe` | `...\firebird_analyzer\license.dat` |
| MySQL Analyzer | `MySQLAnalyzer.exe` | `...\mysql_analyzer\license.dat` |
| Sector DB Repair | `SectorDBRepair.exe` | `...\sector_db_repair\license.dat` |
| DWG Cleaner | `DWGCleaner.exe` | `...\dwg_cleaner\license.dat` |
| Office Cleaner | `OfficeCleaner.exe` | `...\office_cleaner\license.dat` |
| Rename Folder | `RenameFolder.exe` | `...\rename_folder\license.dat` |
| MDB Integrity | `MDBIntegrity.exe` | `...\mdb_integrity\license.dat` |
| Empty Folders | `EmptyFolders.exe` | `...\empty_folders\license.dat` |
| Solução Completa | `SolucaoCompleta.exe` | `...\solucao_completa\license.dat` |

A Solução Completa usa o mesmo produto do portal (`complete-solution`, software
`SolucaoCompleta`) que o Office Cleaner já usava, então a mesma chave ativa os dois.
As chaves dos produtos avulsos não ativam a Solução Completa, e vice-versa, porque o
portal confere o produto de cada chave.

## Padrão de uso (igual em todas as ferramentas)

Os componentes ficam em `shared/WinPortal.Ui/Controls` e cada ferramenta só escolhe o
que muda na sua função:

- **Entrada**: campo `Pasta` (ou `Arquivo`) com o botão "Selecionar pasta…" /
  "Selecionar arquivo…" à direita. Dá para digitar, usar o botão ou arrastar a pasta ou o
  arquivo para o campo. Cada ferramenta lembra a última pasta usada (no app avulso e na
  Solução Completa), em `%LOCALAPPDATA%\WinPortal\CentralScripts\preferencias.json`.
- **Ações**: o botão principal (com o verbo da ferramenta) e "Cancelar", sempre na mesma
  posição, abaixo dos campos. O botão principal só habilita com os campos preenchidos e
  todas as ferramentas podem ser canceladas.
- **Progresso**: barra e linha de estado com a mesma cor por situação (em andamento,
  concluído, concluído com avisos, cancelado, erro).
- **Resultados**: cartão com resumo e as ações "Exportar relatório" e "Limpar" no
  cabeçalho. O relatório sai em CSV com ponto e vírgula (abre direto no Excel).
- **Ações que apagam ou alteram arquivos**: primeiro listam o que será feito, depois
  pedem confirmação e só então executam (analisadores, pastas vazias, renomeação e
  substituição do arquivo de saída do reparo).
- **Nenhum aplicativo apaga arquivos sozinho**: depois da análise, a lista aparece com
  o botão "Apagar" no rodapé do cartão de resultados (`ResultsCard.ShowDelete`). Só ao
  clicar nele e confirmar é que algo é apagado.
- **Fim**: toda execução termina com uma mensagem de resumo; ao fechar a janela com uma
  operação em andamento, o aplicativo pergunta antes.

## Como compilar

Requisitos: .NET 8 SDK e, para os instaladores, Inno Setup 6.3 ou mais recente.

```
build_all.bat                      (publicação + instaladores)
build_all.ps1 -RunTests            (antes confere a licença contra o Python; requer Python e Node.js)
build_all.ps1 -SkipInstallers      (só os executáveis)
build_all.ps1 -App MDBIntegrity    (um aplicativo só)
```

Os executáveis saem em `publish\<Nome>\<Nome>.exe` (arquivo único, sem precisar
instalar o .NET na máquina do cliente) e os instaladores em `dist\instaladores`.

## Ativação (preservada)

A biblioteca `WinPortal.Licensing` reproduz exatamente o contrato de
`docs/CONTRATO-ATIVACAO.md` e o código Python de `activation/`:

- `POST /api/ativar` e `POST /api/revalidar` com os mesmos campos e na mesma ordem;
- chave no formato `WIN-XXXX-XXXX-XXXX-XXXX`;
- assinatura Ed25519 verificada sobre o mesmo JSON canônico, com a mesma chave pública;
- `license.dat` em AES-256-GCM com chave derivada do Machine ID, no mesmo formato e na
  mesma pasta, então uma licença ativada pela versão Python continua válida na versão C#
  e vice-versa;
- revalidação a cada 7 dias e tolerância offline de 30 dias.

`tests\WinPortal.Licensing.Tests` confere isso lendo e gravando licenças junto com o
código Python original e com um assinador idêntico ao do portal (28 verificações).

## Configurações: tema e atualizações

O botão **Configurações** no cabeçalho de todos os aplicativos tem:

- **Tema**: Automático (segue o modo de cor dos aplicativos do Windows), Claro ou Escuro.
  Vale para todos os aplicativos do computador e é aplicado ao reabrir (o aplicativo
  oferece reabrir na hora). As cores ficam em `Themes/Theme.xaml` (claro) e
  `Common/ThemeManager.cs` (escuro).
- **Atualizações**: versão instalada, busca automática ligada ou desligada e
  "Procurar agora". O fluxo completo e como publicar versões estão em
  [docs/ATUALIZACOES.md](docs/ATUALIZACOES.md).

## Diferenças de comportamento em relação ao Python

- **Analisadores e Empty Folders** não apagam ao fim da análise: o usuário escolhe o
  botão "Apagar" e confirma (o DWG Cleaner em Python apagava automaticamente).
- **Image Analyzer** reconhece o formato pelos bytes, como o Pillow (um JPEG salvo como
  .png não é corrompido), e decodifica só o primeiro quadro. Sem o codec WebP do
  Windows, exige blocos RIFF íntegros e um fluxo VP8/VP8L válido.
- **PDF Analyzer** aceita o %%EOF em qualquer ponto do arquivo ou truncado no final,
  como o pypdf; sem nenhum marcador o PDF é rejeitado.
- **Firebird Analyzer** salva o relatório CSV em
  `Documentos\Nexotool\Firebird Analyzer` (antes ia para a pasta de trabalho atual)
  e ganhou o botão "Abrir relatório".
- **Sector DB Repair**: corrigido o erro de nome de função que derrubava o reparo no
  original; os bytes finais que não completam um setor agora são copiados (antes eram
  descartados); o arquivo de saída não pode ser igual a um dos arquivos de entrada.
- **MDB Integrity**: o SHA-256 da leitura usa outra representação dos registros, então
  o valor não é comparável com o calculado pela versão Python. Exige o driver ODBC do
  Access de **64 bits** (Microsoft Access Database Engine), pois o aplicativo é 64 bits.
  Pastas também podem ser arrastadas para a lista.
- **Empty Folders**: "Procurar pastas vazias" só lista; "Apagar" aparece depois, com
  confirmação (a lista não é mais montada automaticamente ao escolher a pasta).
- **Rename Folder** mostra a lista "nome atual -> novo nome" e pede confirmação antes de
  renomear; uma pasta que falhar não interrompe as demais.
- **Firebird Analyzer, MySQL Analyzer, Rename Folder e Sector DB Repair** ganharam o
  botão "Cancelar". No reparo, a gravação vai para um temporário e a saída escolhida só
  é substituída no sucesso: cancelar não apaga nem altera um arquivo que já existia.
- Todos os aplicativos usam o mesmo cabeçalho, rodapé, botões, cores, diálogos e tela de
  ativação; a barra de título do Windows segue o azul-marinho do cabeçalho.

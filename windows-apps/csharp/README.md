# Aplicativos WinPortal em C# (.NET 8 / WPF)

Tradução dos 10 aplicativos Python da pasta `aplicativos` para C#, com a identidade
visual nova do site (azul `#2563EB`, ciano `#22D3EE` nos detalhes, cabeçalho e rodapé
em azul-marinho) e os ícones de `assets/product-icons-v1`. Os originais em Python não
foram alterados.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `shared/WinPortal.Licensing` | Ativação e revalidação com o portal (mesmo contrato da versão Python) |
| `shared/WinPortal.Ui` | Tema, janela principal (cabeçalho, rodapé, selo da licença), tela de ativação, diálogos e componentes comuns |
| `apps/<Nome>` | Um projeto por aplicativo, só com a lógica e a tela da ferramenta |
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
código Python original e com um assinador idêntico ao do portal (27 verificações).

## Diferenças de comportamento em relação ao Python

- **DWG Cleaner** pede confirmação antes de apagar (antes apagava automaticamente),
  igual aos outros analisadores.
- **Firebird Analyzer** salva o relatório CSV em
  `Documentos\WinPortal\Firebird Analyzer` (antes ia para a pasta de trabalho atual)
  e ganhou o botão "Abrir relatório".
- **Sector DB Repair**: corrigido o erro de nome de função que derrubava o reparo no
  original; os bytes finais que não completam um setor agora são copiados (antes eram
  descartados); o arquivo de saída não pode ser igual a um dos arquivos de entrada.
- **MDB Integrity**: o SHA-256 da leitura usa outra representação dos registros, então
  o valor não é comparável com o calculado pela versão Python. Exige o driver ODBC do
  Access de **64 bits** (Microsoft Access Database Engine), pois o aplicativo é 64 bits.
  Pastas também podem ser arrastadas para a lista.
- **Empty Folders** ganhou o botão "Listar vazias" para pré-visualizar antes de limpar.
- Todos os aplicativos usam o mesmo cabeçalho, rodapé, botões, cores, diálogos e tela de
  ativação; a barra de título do Windows segue o azul-marinho do cabeçalho.

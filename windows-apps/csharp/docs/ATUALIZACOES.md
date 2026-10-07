# Atualização automática dos aplicativos

## Como o usuário vê

- Ao abrir e depois a cada 6 horas, o aplicativo pergunta ao portal se há versão nova
  (pode ser desligado em **Configurações > Atualizações**).
- Havendo, aparece uma faixa abaixo do cabeçalho: "Nova versão disponível", com
  **Atualizar agora**, **Depois** e **O que mudou**.
- **Atualizar agora** baixa o arquivo pela própria interface (com barra de progresso e
  opção de cancelar), confere o SHA-256 e aplica:
  - **Instalado pelo instalador**: roda o instalador novo em modo silencioso (o Windows
    pede permissão de administrador) e o aplicativo é reaberto no fim.
  - **Executável avulso**: o `.exe` atual é renomeado para `.old`, o novo ocupa o lugar e
    é aberto; o `.old` é apagado na abertura seguinte.
- A licença não é afetada: fica em `%LOCALAPPDATA%\WinPortal\CentralScripts\<slug>`.

## Segurança

O portal responde em `GET /api/atualizacoes/<Executavel>` um manifesto assinado com a
mesma chave Ed25519 das licenças (o campo `kind: "winportal-update-v1"` impede que seja
confundido com uma licença). O aplicativo só aceita o manifesto com assinatura válida e
só executa o arquivo baixado se o SHA-256 for o do manifesto, que vem do campo `digest`
que o próprio GitHub calcula para cada arquivo do release.

## Como publicar uma versão nova

1. No GitHub, abra **Actions > Publicar aplicativos Windows > Run workflow**.
2. Escolha o aplicativo (ou `todos`), a versão (ex.: `2.0.1`, sempre maior que a
   publicada) e, se quiser, o texto do que mudou.
3. O workflow compila, gera o instalador e cria o release com dois arquivos:
   `<Exe>.exe` (download do site e atualização do executável avulso) e
   `<Exe>-Setup.exe` (atualização de quem instalou).

As tags seguem o id do produto no portal, que o download do site já usa:

| Executável | Tag |
|---|---|
| SolucaoCompleta | `complete-solution-v<versão>` |
| ImageAnalyzer | `image-analyzer-v<versão>` |
| PDFAnalyzer | `pdf-analyzer-v<versão>` |
| FirebirdAnalyzer | `firebird-analyzer-v<versão>` |
| MySQLAnalyzer | `mysql-analyzer-v<versão>` |
| MDBIntegrity | `mdb-integrity-v<versão>` |
| SectorDBRepair | `sector-dbfb-repair-v<versão>` |
| DWGCleaner | `dwg-cleaner-v<versão>` |
| RenameFolder | `rename-folder-v<versão>` |
| EmptyFolders | `empty-folder-cleaner-v<versão>` |
| OfficeCleaner | `office-cleaner-v<versão>` (prefixo próprio: o produto `complete-solution` é da Solução Completa) |

A versão C# começa em **2.0.0** (já existe um release `image-analyzer-v1.2.0` da versão
Python). Para compilar localmente com outra versão: `build_all.ps1 -Version 2.0.1`.

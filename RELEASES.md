# Releases dos aplicativos

O WinPortal pode usar Supabase Storage ou GitHub Releases para downloads.
Para nao ocupar espaco do banco de dados, salve os executaveis em object
storage ou releases, nunca em tabelas Postgres.

Quando `SUPABASE_INSTALLERS_BUCKET` estiver configurado, o site usa primeiro
uma URL assinada do Supabase Storage. Se nao houver bucket configurado, ele usa
GitHub Releases. Cada aplicativo tem sua propria sequencia SemVer e sua propria
tag:

```text
<product-id>-v<major>.<minor>.<patch>
```

Exemplo:

```text
image-analyzer-v1.2.0
```

O site consulta releases publicados, ignora drafts e prereleases, localiza a
tag mais recente do produto e exige o asset com o nome exato da tabela abaixo.

| Produto | Tag | Asset esperado |
|---|---|---|
| Image Analyzer | `image-analyzer-vX.Y.Z` | `ImageAnalyzer.exe` |
| PDF Analyzer | `pdf-analyzer-vX.Y.Z` | `PDFAnalyzer.exe` |
| Firebird Analyzer | `firebird-analyzer-vX.Y.Z` | `FirebirdAnalyzer.exe` |
| MySQL Analyzer | `mysql-analyzer-vX.Y.Z` | `MySQLAnalyzer.exe` |
| Sector DBFB Repair | `sector-dbfb-repair-vX.Y.Z` | `SectorDBRepair.exe` |
| DWG Cleaner | `dwg-cleaner-vX.Y.Z` | `DWGCleaner.exe` |
| Rename Folder | `rename-folder-vX.Y.Z` | `RenameFolder.exe` |
| MDB Integrity | `mdb-integrity-vX.Y.Z` | `MDBIntegrity.exe` |
| Empty Folder Cleaner | `empty-folder-cleaner-vX.Y.Z` | `EmptyFolders.exe` |
| Solucao Completa | `complete-solution-vX.Y.Z` | `OfficeCleaner.exe` |

## Primeiro uso

Instale o GitHub CLI e autentique a conta que pode publicar no repositorio:

```powershell
gh auth login -h github.com
gh auth status
```

## Publicar

Primeiro execute o `build.bat` do aplicativo. Depois, na pasta `win-portal`,
execute:

```bat
publish-release.bat image-analyzer 1.2.0 "Correcoes e melhorias da versao 1.2.0"
```

O publicador:

1. valida o `product-id` e o SemVer;
2. encontra o `.exe` na pasta `aplicativos/<produto>/dist`;
3. mostra tag, arquivo e tamanho para confirmacao;
4. cria a tag e o GitHub Release;
5. envia o `.exe` como asset.

Para publicacao nao interativa, acrescente `-Yes`. Para uma versao de teste,
use `-Prerelease`; prereleases nao substituem o download publico no site.
Use `-DryRun` para validar o produto, a versao e o caminho do executavel sem
criar nada no GitHub.

## Atualizacao no site

O site mostra a versao e a data do release na pagina do produto. O endpoint
`/api/download/<product-id>` redireciona primeiro para Supabase Storage quando
`SUPABASE_INSTALLERS_BUCKET` existir. Caso contrario, redireciona para o
`browser_download_url` do asset no GitHub. O cache padrao do GitHub e de cinco
minutos, configuravel por `GITHUB_RELEASES_CACHE_SECONDS`.

Se o GitHub estiver indisponivel ou ainda nao houver release valido, o site usa
as antigas variaveis `DOWNLOAD_URL_*`, `DOWNLOAD_BASE_URL` e
`DOWNLOAD_FALLBACK_URL` como fallback.

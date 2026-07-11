param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ProductId,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$Version,

    [Parameter(Position = 2)]
    [string]$Notes = "",

    [switch]$Prerelease,
    [switch]$Yes,
    [switch]$DryRun,
    [string]$Repository = "gustavotoigo-max/win-portal"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$products = @{
    "image-analyzer"       = @{ Name = "Image Analyzer";       Directory = "image_analyzer";    Asset = "ImageAnalyzer.exe" }
    "pdf-analyzer"         = @{ Name = "PDF Analyzer";         Directory = "pdf_analyzer";      Asset = "PDFAnalyzer.exe" }
    "firebird-analyzer"    = @{ Name = "Firebird Analyzer";    Directory = "firebird_analyzer"; Asset = "FirebirdAnalyzer.exe" }
    "mysql-analyzer"       = @{ Name = "MySQL Analyzer";       Directory = "mysql_analyzer";    Asset = "MySQLAnalyzer.exe" }
    "sector-dbfb-repair"   = @{ Name = "Sector DBFB Repair";   Directory = "sector_db_repair";  Asset = "SectorDBRepair.exe" }
    "dwg-cleaner"          = @{ Name = "DWG Cleaner";          Directory = "dwg_cleaner";       Asset = "DWGCleaner.exe" }
    "rename-folder"        = @{ Name = "Rename Folder";        Directory = "rename_folder";     Asset = "RenameFolder.exe" }
    "mdb-integrity"        = @{ Name = "MDB Integrity";        Directory = "mdb_integrity";     Asset = "MDBIntegrity.exe" }
    "empty-folder-cleaner" = @{ Name = "Empty Folder Cleaner"; Directory = "empty_folders";     Asset = "EmptyFolders.exe" }
    "complete-solution"    = @{ Name = "Solucao Completa";     Directory = "office_cleaner";    Asset = "OfficeCleaner.exe" }
}

if (-not $products.ContainsKey($ProductId)) {
    $validProducts = ($products.Keys | Sort-Object) -join ", "
    throw "Produto invalido: $ProductId. Valores aceitos: $validProducts"
}

$normalizedVersion = $Version.Trim()
if ($normalizedVersion.StartsWith("v", [System.StringComparison]::OrdinalIgnoreCase)) {
    $normalizedVersion = $normalizedVersion.Substring(1)
}
if ($normalizedVersion -notmatch '^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$') {
    throw "Versao invalida: $Version. Use SemVer, por exemplo 1.2.0."
}

$product = $products[$ProductId]
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$assetPath = Join-Path $workspaceRoot "aplicativos\$($product.Directory)\dist\$($product.Asset)"
$tag = "$ProductId-v$normalizedVersion"
$title = "$($product.Name) v$normalizedVersion"

if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
    throw "Executavel nao encontrado: $assetPath. Execute o build.bat do aplicativo primeiro."
}

$asset = Get-Item -LiteralPath $assetPath
Write-Host ""
Write-Host "Produto : $($product.Name)"
Write-Host "Versao : $normalizedVersion"
Write-Host "Tag     : $tag"
Write-Host "Arquivo : $($asset.FullName)"
Write-Host "Tamanho : $([math]::Round($asset.Length / 1MB, 2)) MB"
Write-Host "Repo    : $Repository"

if ($DryRun) {
    Write-Host "DRY RUN: nenhuma tag ou release foi criado." -ForegroundColor Yellow
    exit 0
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI nao encontrado. Instale em https://cli.github.com/"
}

& gh auth status -h github.com
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI sem autenticacao valida. Execute: gh auth login -h github.com"
}

& gh release view $tag --repo $Repository *> $null
if ($LASTEXITCODE -eq 0) {
    throw "O release $tag ja existe. Escolha outra versao."
}

if (-not $Yes) {
    $confirmation = Read-Host "Publicar este release? [s/N]"
    if ($confirmation -notin @("s", "S", "sim", "SIM", "Sim")) {
        Write-Host "Publicacao cancelada."
        exit 0
    }
}

$arguments = @(
    "release", "create", $tag, $asset.FullName,
    "--repo", $Repository,
    "--target", "main",
    "--title", $title
)

if ([string]::IsNullOrWhiteSpace($Notes)) {
    $Notes = "Release de $($product.Name) v$normalizedVersion."
}
$arguments += @("--notes", $Notes)

if ($Prerelease) {
    $arguments += "--prerelease"
}

& gh @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao criar o release no GitHub."
}

Write-Host ""
Write-Host "Release publicado com sucesso: $tag" -ForegroundColor Green
Write-Host "O site passara a usar este asset automaticamente apos o cache expirar."

# Publica os 10 aplicativos avulsos e a Solução Completa (.NET 8, executável único
# self-contained) e,
# se o Inno Setup 6 estiver instalado, gera os instaladores.
#
# Uso:  powershell -ExecutionPolicy Bypass -File build_all.ps1 [-SkipInstallers] [-RunTests] [-App MDBIntegrity] [-Version 1.0.1]
# -Version define a versão dos executáveis e dos instaladores (padrão 2.0.0). Releases oficiais saem
# pelo GitHub Actions ("Publicar aplicativos Windows"), ver docs/ATUALIZACOES.md.
# -RunTests confere a licenca contra o codigo Python original (requer Python com "cryptography" e Node.js).
param(
    [switch]$SkipInstallers,
    [switch]$RunTests,
    [string]$App = "",
    [string]$Version = "2.0.0"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$publishRoot = Join-Path $root "publish"
$failures = @()

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "O .NET 8 SDK nao foi encontrado. Instale em https://dotnet.microsoft.com/download/dotnet/8.0" -ForegroundColor Red
    exit 1
}

if ($RunTests) {
    Write-Host "Executando testes da biblioteca de licenca..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "tests\WinPortal.Licensing.Tests")
    & dotnet run -c Release -- ..\fixtures
    $testsOk = ($LASTEXITCODE -eq 0)
    Pop-Location
    if (-not $testsOk) {
        Write-Host "Os testes da licenca falharam; nada foi publicado." -ForegroundColor Red
        exit 1
    }
}

$projects = Get-ChildItem -Path (Join-Path $root "apps") -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName "$($_.Name).csproj") } |
    Where-Object { $App -eq "" -or $_.Name -eq $App }

foreach ($project in $projects) {
    $name = $project.Name
    Write-Host "Publicando $name..." -ForegroundColor Cyan
    $output = Join-Path $publishRoot $name
    if (Test-Path $output) { Remove-Item $output -Recurse -Force }
    & dotnet publish (Join-Path $project.FullName "$name.csproj") -c Release -o $output --nologo "-p:Version=$Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FALHA ao publicar $name." -ForegroundColor Red
        $failures += $name
    }
}

if (-not $SkipInstallers) {
    $iscc = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($iscc) {
        foreach ($project in $projects) {
            $name = $project.Name
            if ($failures -contains $name) { continue }
            Write-Host "Gerando instalador de $name..." -ForegroundColor Cyan
            & $iscc /Q "/DAppVersion=$Version" (Join-Path $root "installer\$name.iss")
            if ($LASTEXITCODE -ne 0) {
                Write-Host "FALHA no instalador de $name." -ForegroundColor Red
                $failures += "$name (instalador)"
            }
        }
    } else {
        Write-Host "Inno Setup 6 nao encontrado; instaladores nao foram gerados." -ForegroundColor Yellow
        Write-Host "Instale em https://jrsoftware.org/isdl.php e execute este script novamente." -ForegroundColor Yellow
    }
}

Write-Host ""
if ($failures.Count -gt 0) {
    Write-Host "Concluido com falhas: $($failures -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "Executaveis em: $publishRoot" -ForegroundColor Green
if (-not $SkipInstallers) { Write-Host "Instaladores em: $(Join-Path $root 'dist\instaladores')" -ForegroundColor Green }

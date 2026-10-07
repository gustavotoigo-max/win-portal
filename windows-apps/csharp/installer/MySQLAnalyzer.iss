; Instalador do MySQL Analyzer (versão C#/.NET 8) - gerado para Inno Setup 6.3+
; Compile depois de publicar o aplicativo com build_all.ps1.

#define AppName "MySQL Analyzer"
#define AppExe "MySQLAnalyzer.exe"
; Pastas usadas pelo script. O build_all.ps1 também deixa uma cópia pronta deste script
; na pasta do executável (publish\MySQLAnalyzer), com o ícone e as imagens em "instalador".
#ifndef PublishDir
  #define PublishDir "..\publish\MySQLAnalyzer"
#endif
#ifndef AssetsDir
  #define AssetsDir "..\apps\MySQLAnalyzer\Assets"
#endif
#ifndef BrandingDir
  #define BrandingDir "branding"
#endif
#ifndef OutputFolder
  #define OutputFolder "..\dist\instaladores"
#endif
; A versão vem do próprio executável (2.0.0.0 vira 2.0.0); /DAppVersion=x.y.z força outra.
#ifndef AppVersion
  #define AppVersion RemoveFileExt(GetVersionNumbersString(AddBackslash(SourcePath) + PublishDir + "\" + AppExe))
#endif
#if AppVersion == ""
  #error Executável não encontrado em PublishDir. Rode o build_all.ps1 antes de compilar o instalador.
#endif

[Setup]
AppId={{2EC8C8BB-27E9-55D5-99C0-DB74C622DCA8}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Nexotool
AppPublisherURL=https://nexotool.com.br
AppSupportURL=https://nexotool.com.br/pt/dashboard
AppUpdatesURL=https://nexotool.com.br/pt/solucoes
AppComments=Diagnóstico de bancos de dados MySQL
VersionInfoCompany=Nexotool
VersionInfoDescription={#AppName} - instalador
VersionInfoVersion={#AppVersion}
DefaultDirName={autopf}\Nexotool\{#AppName}
DefaultGroupName=Nexotool\{#AppName}
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
PrivilegesRequired=admin
OutputDir={#OutputFolder}
OutputBaseFilename=MySQLAnalyzer-Setup-{#AppVersion}
SetupIconFile={#AssetsDir}\app.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
WizardStyle=modern
WizardImageFile={#BrandingDir}\MySQLAnalyzer-wizard.bmp,{#BrandingDir}\MySQLAnalyzer-wizard@2x.bmp
WizardSmallImageFile={#BrandingDir}\MySQLAnalyzer-small.bmp,{#BrandingDir}\MySQLAnalyzer-small@2x.bmp
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#PublishDir}\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
; Atualização automática: o aplicativo roda o instalador com /SILENT /RELAUNCH e é reaberto no fim.
Filename: "{app}\{#AppExe}"; Flags: nowait runasoriginaluser; Check: ShouldRelaunch

; A licença (%LOCALAPPDATA%\WinPortal\CentralScripts\mysql_analyzer\license.dat) é mantida
; na desinstalação de propósito, para que uma reinstalação não peça nova ativação.

[Code]
function ShouldRelaunch: Boolean;
begin
  Result := WizardSilent and (Pos('/RELAUNCH', UpperCase(GetCmdTail)) > 0);
end;

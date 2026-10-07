; Instalador do DWG Cleaner (versão C#/.NET 8) - gerado para Inno Setup 6.3+
; Compile depois de publicar o aplicativo com build_all.ps1 (pasta ..\publish\DWGCleaner).

#define AppName "DWG Cleaner"
#define AppExe "DWGCleaner.exe"
#ifndef AppVersion
  #define AppVersion "2.0.0"
#endif

[Setup]
AppId={{718499C8-984B-5351-9511-E30ACCFBE7F2}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=WinPortal
AppPublisherURL=https://win-portal.vercel.app
AppSupportURL=https://win-portal.vercel.app/pt/dashboard
AppUpdatesURL=https://win-portal.vercel.app/pt/solucoes
AppComments=Organização de arquivos CAD
VersionInfoCompany=WinPortal
VersionInfoDescription={#AppName} - instalador
VersionInfoVersion={#AppVersion}
DefaultDirName={autopf}\WinPortal\{#AppName}
DefaultGroupName=WinPortal\{#AppName}
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
PrivilegesRequired=admin
OutputDir=..\dist\instaladores
OutputBaseFilename=DWGCleaner-Setup-{#AppVersion}
SetupIconFile=..\apps\DWGCleaner\Assets\app.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
WizardStyle=modern
WizardImageFile=branding\DWGCleaner-wizard.bmp,branding\DWGCleaner-wizard@2x.bmp
WizardSmallImageFile=branding\DWGCleaner-small.bmp,branding\DWGCleaner-small@2x.bmp
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\publish\DWGCleaner\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.pdb"

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
; Atualização automática: o aplicativo roda o instalador com /SILENT /RELAUNCH e é reaberto no fim.
Filename: "{app}\{#AppExe}"; Flags: nowait runasoriginaluser; Check: ShouldRelaunch

; A licença (%LOCALAPPDATA%\WinPortal\CentralScripts\dwg_cleaner\license.dat) é mantida
; na desinstalação de propósito, para que uma reinstalação não peça nova ativação.

[Code]
function ShouldRelaunch: Boolean;
begin
  Result := WizardSilent and (Pos('/RELAUNCH', UpperCase(GetCmdTail)) > 0);
end;

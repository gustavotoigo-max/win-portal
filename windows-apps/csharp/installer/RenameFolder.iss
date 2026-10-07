; Instalador do Rename Folder (versão C#/.NET 8) - gerado para Inno Setup 6.3+
; Compile depois de publicar o aplicativo com build_all.ps1 (pasta ..\publish\RenameFolder).

#define AppName "Rename Folder"
#define AppExe "RenameFolder.exe"
#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{52111B50-E148-5245-8927-E33903F6B2DC}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=WinPortal
AppPublisherURL=https://win-portal.vercel.app
AppSupportURL=https://win-portal.vercel.app/pt/dashboard
AppUpdatesURL=https://win-portal.vercel.app/pt/solucoes
AppComments=Organização de pastas em lote
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
OutputBaseFilename=RenameFolder-Setup-{#AppVersion}
SetupIconFile=..\apps\RenameFolder\Assets\app.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
WizardStyle=modern
WizardImageFile=branding\RenameFolder-wizard.bmp,branding\RenameFolder-wizard@2x.bmp
WizardSmallImageFile=branding\RenameFolder-small.bmp,branding\RenameFolder-small@2x.bmp
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\publish\RenameFolder\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.pdb"

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

; A licença (%LOCALAPPDATA%\WinPortal\CentralScripts\rename_folder\license.dat) é mantida
; na desinstalação de propósito, para que uma reinstalação não peça nova ativação.

; Instalador do Firebird Analyzer (versão C#/.NET 8) - gerado para Inno Setup 6.3+
; Compile depois de publicar o aplicativo com build_all.ps1 (pasta ..\publish\FirebirdAnalyzer).

#define AppName "Firebird Analyzer"
#define AppExe "FirebirdAnalyzer.exe"
#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{F1E4EC20-561A-57FC-AFA4-F8DC09613C0C}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=WinPortal
AppPublisherURL=https://win-portal.vercel.app
AppSupportURL=https://win-portal.vercel.app/pt/dashboard
AppUpdatesURL=https://win-portal.vercel.app/pt/solucoes
AppComments=Diagnóstico de bancos de dados Firebird
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
OutputBaseFilename=FirebirdAnalyzer-Setup-{#AppVersion}
SetupIconFile=..\apps\FirebirdAnalyzer\Assets\app.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
WizardStyle=modern
WizardImageFile=branding\FirebirdAnalyzer-wizard.bmp,branding\FirebirdAnalyzer-wizard@2x.bmp
WizardSmallImageFile=branding\FirebirdAnalyzer-small.bmp,branding\FirebirdAnalyzer-small@2x.bmp
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\publish\FirebirdAnalyzer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.pdb"

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

; A licença (%LOCALAPPDATA%\WinPortal\CentralScripts\firebird_analyzer\license.dat) é mantida
; na desinstalação de propósito, para que uma reinstalação não peça nova ativação.

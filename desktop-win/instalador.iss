; Instalador do Faisca para Windows (Inno Setup 6).
; Rode depois do npm run build:win, a partir da raiz do projeto:
;   ISCC /DAppVersion=1.1.0 desktop-win\instalador.iss

#define AppName "Faísca"
#define AppExe "Faisca.exe"

#ifndef AppVersion
  #error Informe a versao: ISCC /DAppVersion=1.1.0 desktop-win\instalador.iss
#endif

[Setup]
; Identifica o programa para o Windows. Nunca mude: e o que faz uma versao
; nova atualizar a instalada em vez de aparecer como outro programa.
AppId={{3B0E0C1D-6C3E-4F0B-9B55-2F7A6D1E8A41}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=DinTools
AppPublisherURL=https://dintools.com.br
AppSupportURL=https://dintools.com.br/produtos/faisca
AppUpdatesURL=https://dintools.com.br/meu-kit

; Instala para todos os usuarios, em Arquivos de Programas, como a maioria
; dos programas: sem perguntar o modo de instalacao. O Windows pede a
; permissao de administrador. A pasta continua sendo escolha da pessoa.
PrivilegesRequired=admin
DefaultDirName={autopf}\DinTools\{#AppName}
DisableDirPage=no
UsePreviousAppDir=yes
DefaultGroupName=DinTools
DisableProgramGroupPage=yes

ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
UninstallDisplayName={#AppName}
UninstallDisplayIcon={app}\{#AppExe}

SourceDir=..
OutputDir=dist-webview2
OutputBaseFilename=Faisca-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=icons\faisca.ico

[Languages]
Name: "ptbr"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist-webview2\Faisca-Leve\Faisca.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\DinTools\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent


; Os dados do aplicativo ficam em %APPDATA%\faisca-desktop e nao sao tocados
; nem ao atualizar nem ao desinstalar.

# Empacotar o Faísca para PC

Use sempre a versão WebView2. Ela usa o motor do Edge que já vem no Windows, por isso fica bem mais leve e organizada que a versão Electron.

## Comando certo

```powershell
npm run build:win
```

Esse comando gera:

```text
dist-webview2/Faisca-Leve/Faisca.exe
```

Esse é o executável correto para testar e distribuir no PC.

## O que evitar

As pastas abaixo são saídas de empacotamentos antigos ou alternativos em Electron:

```text
dist/
dist-packager/
```

Elas podem aparecer localmente depois de testes antigos, mas não são a versão recomendada. O Electron gera arquivos maiores e pode confundir na hora de escolher o `.exe`.

## Projeto usado

O empacotamento leve fica em:

```text
desktop-win/
```

Ele carrega a versão publicada em:

```text
https://dintools.com.br/faisca/
```

O aplicativo só abre a página; o Faísca em si é atualizado no site do DinTools
(`scripts/sync-faisca.sh`, no projeto do site), sem precisar empacotar de novo.

## Instalador

Depois do `npm run build:win`, o instalador é montado com o Inno Setup 6:

```powershell
& "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe" /DAppVersion=1.1.0 desktop-win\instalador.iss
```

Sai em `dist-webview2/Faisca-Setup-<versão>.exe`. É ele que vai para o Meu kit.

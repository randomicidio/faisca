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
https://randomicidio.github.io/faisca/
```

Então, antes de empacotar para PC, publique a versão web atual no GitHub Pages.

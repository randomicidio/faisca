# Empacotar o Faisca para Mac

A versao Mac usa Electron. Ela carrega o mesmo app publicado em:

```text
https://randomicidio.github.io/faisca/
```

Entao, antes de empacotar, publique a versao web atual no GitHub Pages.

## Onde gerar

Gere o pacote em um Mac. O empacotamento para macOS depende de ferramentas do proprio macOS, especialmente para `.dmg`, assinatura e notarizacao.

## Comando

```bash
npm install
npm run build:mac
```

Isso gera os arquivos em:

```text
dist/
```

Normalmente saem um `.dmg` para distribuir e um `.zip` de apoio.

## Primeiro teste

Para testar sem empacotar:

```bash
npm install
npm run desktop:electron
```

## Observacao

Sem assinatura/notarizacao da Apple, o macOS pode mostrar aviso de seguranca na primeira abertura. Para distribuir fora do seu proprio computador, o ideal e assinar e notarizar com uma conta Apple Developer.

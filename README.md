# Faísca

Faísca é um app para guardar ideias de conteúdo, organizar o andamento delas e manter tudo acessível no celular e no computador.

Ele pode ser usado de três jeitos:

- **Celular ou navegador:** [randomicidio.github.io/faisca](https://randomicidio.github.io/faisca/)
- **Windows:** baixe o `Faisca.exe` na página de releases
- **Mac:** baixe o `.dmg` na página de releases

O app funciona mesmo sem login. Quando você conecta o Google Drive, as ideias sincronizam entre seus aparelhos usando o seu próprio Drive.

## O Que Ele Faz

- Guarda ideias de conteúdo em uma lista simples.
- Permite organizar cada ideia por etapa.
- Salva textos, anotações e mídias ligadas a cada ideia.
- Funciona offline depois de carregado.
- Sincroniza pelo Google Drive quando conectado.
- Tem versão instalável no celular, Windows e Mac.

## Como Usar No Celular

1. Abra [randomicidio.github.io/faisca](https://randomicidio.github.io/faisca/) no navegador do celular.
2. Entre no menu do navegador.
3. Toque em **Adicionar à tela inicial** ou **Instalar app**.
4. Abra pelo ícone do Faísca.

No Android, isso costuma aparecer no menu de três pontinhos do Chrome. No iPhone, normalmente fica no botão de compartilhar do Safari.

## Como Usar No Computador

Você pode usar direto pelo navegador:

[randomicidio.github.io/faisca](https://randomicidio.github.io/faisca/)

Ou baixar uma versão de computador:

[Releases do Faísca](https://github.com/randomicidio/faisca/releases)

Na lista de arquivos do release:

- `Faisca.exe` é a versão para **Windows**.
- `Mac-Faisca-...dmg` é a versão para **Mac Apple Silicon**.

## Sincronização Com Google Drive

A sincronização é opcional.

Sem conectar o Drive, suas ideias ficam salvas apenas no aparelho onde você está usando o app.

Com o Drive conectado:

- suas ideias aparecem nos seus outros aparelhos;
- o app cria e usa uma pasta chamada **Faísca** no seu Google Drive;
- o app não acessa o resto do seu Drive;
- o login do celular é renovado em segundo plano por um backend gratuito na Cloudflare;
- o Windows e o Mac usam o login próprio do aplicativo de computador.

Na primeira vez, o Google pode pedir permissão. Depois disso, o login deve durar bastante tempo. No celular, a sessão atual foi configurada para durar até 180 dias, desde que você não limpe os dados do navegador e não revogue o acesso no Google.

## Onde Meus Dados Ficam

O Faísca usa três lugares, dependendo de como você usa:

- **No aparelho:** para funcionar rápido e offline.
- **No Google Drive:** quando a sincronização está conectada.
- **Na Cloudflare:** apenas para guardar de forma segura a autorização longa do login web. Suas ideias não ficam lá.

O arquivo principal de sincronização no Drive se chama:

```text
faisca-dados.json
```

## Como Conferir A Versão

Dentro do app:

1. Abra o menu.
2. Toque em **Sobre o Faísca**.
3. Veja a versão do app e o pacote atual, por exemplo `v67`.

Esse número ajuda a saber se o celular ou o navegador já recebeu a atualização mais nova.

## Backup Manual

Mesmo usando Drive, é uma boa ideia fazer backup quando você quiser guardar uma cópia fora do app.

No menu do Faísca, use:

- **Fazer backup** para baixar um arquivo com suas ideias.
- **Restaurar backup** para trazer esse arquivo de volta.

## Se Algo Não Atualizar

Se o celular parecer preso em uma versão antiga:

1. Feche e abra o app de novo.
2. Abra **Sobre o Faísca** e confira o pacote atual.
3. Se ainda estiver antigo, abra pelo navegador uma vez em [randomicidio.github.io/faisca](https://randomicidio.github.io/faisca/).
4. Em último caso, remova o app da tela inicial e instale novamente.

## Se O Login Cair

Tente conectar o Google Drive novamente pelo menu do app.

O login pode cair se:

- você limpou os dados/cache do navegador;
- você desconectou o Drive no app;
- você removeu a permissão do Faísca na sua conta Google;
- a sessão antiga expirou;
- o Google pediu uma nova confirmação por segurança.

## Para Quem Vai Manter O Projeto

Os arquivos principais são:

```text
index.html              página principal
css/styles.css          visual do app
js/config.js            versão, IDs e configurações públicas
js/app.js               interface e comportamento principal
js/drive.js             login e sincronização com Google Drive
js/store.js             dados locais
js/media.js             mídias locais
service-worker.js       cache offline
desktop-win/            versão Windows
electron/               versão Mac
workers/faisca-auth/    backend Cloudflare do login duradouro
```

Quando publicar uma mudança para web/celular, atualize o pacote em `js/config.js`, `index.html` e `service-worker.js`. O número aparece na tela **Sobre o Faísca**.

## Publicação

O site web é publicado pelo GitHub Pages:

[randomicidio.github.io/faisca](https://randomicidio.github.io/faisca/)

As versões de computador são publicadas nos releases do GitHub:

[github.com/randomicidio/faisca/releases](https://github.com/randomicidio/faisca/releases)

O backend de login duradouro está na Cloudflare:

```text
https://faisca-auth.dincreation.workers.dev
```

## Build Da Versão Windows

Para gerar o `.exe` do Windows:

```bash
npm run build:win
```

O arquivo gerado fica em:

```text
dist-webview2/Faisca-Leve/Faisca.exe
```

## Build Da Versão Mac

A versão Mac é gerada pelo GitHub Actions em uma máquina macOS. Isso é necessário porque o `.dmg` precisa ser criado em ambiente Mac.

O workflow fica em:

```text
.github/workflows/build-mac.yml
```

## Licença

Projeto pessoal do Faísca.

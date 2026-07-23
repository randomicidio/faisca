# Backend de sessao do Faisca

Este Worker guarda a credencial de renovacao do Google de forma cifrada e devolve
ao site apenas um token temporario do Drive. Assim, no celular, o login continua
ativo por ate 180 dias sem nenhuma tela extra para a pessoa.

## Publicar uma vez

1. Crie uma conta gratuita em [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Neste diretorio, instale as dependencias e entre na conta:

```powershell
npm install
npx wrangler login
npx wrangler kv namespace create SESSIONS
```

3. Copie o `id` devolvido pelo ultimo comando para o campo `id` de
   `wrangler.jsonc`.
4. Publique uma primeira vez:

```powershell
npx wrangler deploy
```

   Guarde a URL terminada em `.workers.dev` que aparecer.
5. No Google Cloud, abra as credenciais do cliente OAuth do tipo **Aplicativo da
   Web** ja usado pelo site e adicione esta URL, com `/auth/callback` no fim, em
   **URIs de redirecionamento autorizados**.
6. Cadastre os tres segredos. O primeiro e o mesmo Client ID que esta em
   `js/config.js`; o segundo e o Client Secret desse cliente web no Google Cloud.
   Para a chave de cifragem, use uma sequencia aleatoria de 32 bytes em Base64.

```powershell
npx wrangler secret put GOOGLE_WEB_CLIENT_ID
npx wrangler secret put GOOGLE_WEB_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
```

   Uma forma de gerar a ultima no PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

7. Publique de novo: `npx wrangler deploy`.
8. No `js/config.js`, preencha `DRIVE_SESSION_API` com a URL do Worker, sem barra
   no final. Publique o site no GitHub Pages normalmente.

O Worker aceita chamadas apenas do endereco publico do Faisca. Ele nao recebe
nem armazena ideias, midias ou senha do Google: somente a credencial cifrada que
serve para renovar o acesso de cada pessoa ao proprio Drive.

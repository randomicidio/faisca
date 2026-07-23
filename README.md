# 🔥 Faísca — seu estúdio de ideias

Um app (PWA) pra anotar, organizar e acompanhar suas ideias de conteúdo — do rascunho
até a postagem. Funciona no PC e no celular, instala como aplicativo, e sincroniza
pelo **Google Drive de cada pessoa** (cada um guarda os próprios dados na própria conta).

---

## O que tem aqui

```
faisca/
├── index.html            ← a página principal
├── manifest.webmanifest  ← faz virar "app instalável"
├── service-worker.js     ← faz funcionar offline
├── css/styles.css        ← visual
├── js/
│   ├── config.js         ← 👉 ÚNICO arquivo que você mexe (Client ID)
│   ├── store.js          ← dados + salvamento local
│   ├── drive.js          ← sincronização com o Google Drive
│   └── app.js            ← a interface
└── icons/                ← ícones do app
```

Sem conectar nada, o app **já funciona 100%**: salva tudo no próprio aparelho e tem
**Backup / Restaurar** no menu (☰). A sincronização com o Drive é opcional e é o que
faz seus dados aparecerem no PC **e** no celular ao mesmo tempo.

---

## 1) Testar no seu PC agora (opcional)

Precisa abrir por um "servidor" (não pode ser só clicando no arquivo, por causa do
service worker). O jeito mais fácil, se você tem Python:

```bash
cd caminho/para/faisca
python -m http.server 4599
```

Depois abra **http://localhost:4599** no navegador. Pronto pra brincar.

> Sem Python? Dá pra pular direto pra publicação (passo 3) — lá também é fácil.

---

## 2) Ligar a sincronização com o Google Drive

Isso é uma configuração **única**, feita por você (dono do app). Depois, qualquer
pessoa que abrir o link só clica em "Conectar com o Google" e usa o Drive dela.

### 2.1 — Criar o projeto no Google

1. Entre em **https://console.cloud.google.com/** (com sua conta Google).
2. No topo, clique no seletor de projeto → **Novo projeto** → dê o nome `Faisca` → **Criar**.
3. No menu (☰) vá em **APIs e serviços → Biblioteca**, procure **Google Drive API**
   e clique em **Ativar**.

### 2.2 — Tela de consentimento

1. Menu → **APIs e serviços → Tela de permissão OAuth**.
2. Tipo de usuário: **Externo** → **Criar**.
3. Preencha só o obrigatório: nome do app (`Faísca`), e-mail de suporte e e-mail de
   contato. Pode deixar o resto em branco → **Salvar e continuar**.
4. Em **Escopos**, pode seguir sem adicionar nada → **Salvar e continuar**.
   (O app usa o escopo `drive.file`, que é considerado **não sensível** — por isso
   você **não precisa** passar por verificação do Google pra outras pessoas usarem.)
5. No fim, em **Público-alvo / Publicação**, clique em **Publicar app** → confirme.
   Assim ele sai do modo "teste" e qualquer pessoa consegue conectar.

### 2.3 — Pegar o Client ID

1. Menu → **APIs e serviços → Credenciais**.
2. **Criar credenciais → ID do cliente OAuth**.
3. Tipo de aplicativo: **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione os endereços de onde o app vai rodar.
   Coloque **exatamente** a origem, sem barra no final:
   - `http://localhost:4599`  (pra testar no PC)
   - `https://SEUDOMINIO.com`  (o endereço final — veja o passo 3)
   - Se usar Netlify/Vercel antes do domínio, adicione também o endereço deles
     (ex: `https://faisca.netlify.app`).
5. **Criar**. Copie o **Client ID** (termina em `.apps.googleusercontent.com`).

### 2.4 — Colar no app

Abra `js/config.js` e cole o Client ID:

```js
GOOGLE_CLIENT_ID: "1234567890-xxxxxxxx.apps.googleusercontent.com",
```

Salve. Pronto — o botão **Conectar Google Drive** passa a funcionar.

> ⚠️ O Client ID **não é secreto** — pode ficar no código sem problema. Ele só diz
> "quem é o app". Cada pessoa autoriza o próprio Drive, e o app só toca no arquivo
> `faisca-dados.json` que ele mesmo cria. Nada mais do Drive de ninguém é acessado.

---

## 3) Publicar (colocar no ar de graça)

Você precisa de um endereço **https**. A forma mais fácil sem complicação:

### Opção A — Netlify Drop (mais fácil, arrasta e solta)
1. Vá em **https://app.netlify.com/drop**.
2. **Arraste a pasta `faisca` inteira** pra dentro da página.
3. Em segundos ele te dá um link tipo `https://algo.netlify.app`. Já está no ar!
4. Volte no passo **2.3** e adicione esse endereço nas *Origens JavaScript autorizadas*.

### Opção B — Vercel
Parecido: crie conta em **vercel.com**, importe a pasta, publica sozinho.

### Usar seu domínio próprio
No painel da Netlify/Vercel → **Domain settings / Add domain** → digite seu domínio →
eles mostram o que apontar (um registro **CNAME** ou os **nameservers**) no painel de
onde você registrou o domínio. Depois é só esperar propagar. Aí adicione
`https://SEUDOMINIO.com` nas origens autorizadas (passo 2.3) também.

> Quando quiser, me chama que eu te guio nessa parte do domínio pelo painel específico
> do seu registrador.

---

## 4) Instalar como app (no celular e no PC)

- **Android (Chrome):** abra o link → menu **⋮** → **Instalar app / Adicionar à tela inicial**.
- **PC (Chrome/Edge):** abra o link → ícone de instalar na barra de endereço (ou menu → **Instalar Faísca**).

Vira ícone próprio, abre em tela cheia, funciona offline.

---

## Gerar o app leve para Windows

Para testar ou distribuir o app como `.exe` no PC, use a versão WebView2:

```bash
npm run build:win
```

O executável correto fica em:

```text
dist-webview2/Faisca-Leve/Faisca.exe
```

Evite usar as pastas `dist/` e `dist-packager/`: elas são saídas antigas em Electron,
bem maiores. O caminho recomendado é sempre `desktop-win/` → `dist-webview2/`.

---

## 5) Backup e sincronização — como pensar

- **Sem Drive:** os dados ficam só naquele aparelho/navegador. Use **☰ → Fazer backup**
  pra baixar um arquivo `.json`, e **Restaurar backup** pra trazer de volta (ou levar
  pra outro aparelho).
- **Com Drive conectado:** o **texto e as etapas** sincronizam automático entre os
  aparelhos daquela conta. Se você editar no PC e no celular **ao mesmo tempo**, vale a
  última edição salva — na prática, pra uso solo, isso quase nunca dá conflito.
- **Mídias (áudio/vídeo):** ficam salvas **em cada aparelho** (são pesadas pra sincronizar).
  Elas não vão no backup `.json` nem no Drive por enquanto. Sincronizar mídia entre
  aparelhos é um próximo passo que dá pra montar (subir cada clipe como arquivo no Drive).

> Observação: a gravação usa o formato **webm**, que funciona muito bem no Android e no PC
> (Chrome/Edge). No iPhone o suporte varia — se for usar muito no iOS, me avise que eu adapto.

---

## Atualizar o app depois de mexer no código

O `service-worker.js` guarda os arquivos em cache pra funcionar offline. Quando você
mudar algo e publicar de novo, aumente o número da versão no topo do arquivo:

```js
const CACHE = "faisca-v2";   // era v1
```

Assim todo mundo recebe a versão nova na próxima vez que abrir.

---

Feito com carinho pra tornar a criação de conteúdo mais leve e organizada. 🔥

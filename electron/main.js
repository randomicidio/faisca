const { app, BrowserWindow, ipcMain, shell } = require("electron");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const APP_URL = "https://randomicidio.github.io/faisca/";

// ============================================================
//  Modo portátil
//  Tudo que o app guarda (ideias, mídias, sessão do Google) fica
//  numa pasta ao lado do .exe, e não espalhado pelo AppData do
//  Windows. Assim dá pra levar a pasta inteira num pendrive.
// ============================================================
function tornarPortatil() {
  if (process.platform !== "win32") return;
  if (!app.isPackaged) return;   // em desenvolvimento o .exe é o do Electron
  const destino = path.join(path.dirname(app.getPath("exe")), "Dados do Faisca");
  const antigo = app.getPath("userData");   // precisa ser lido antes de trocar
  try {
    fs.mkdirSync(destino, { recursive: true });
    fs.accessSync(destino, fs.constants.W_OK);   // pasta só-leitura: melhor não mexer
  } catch (e) {
    return;                                       // segue no caminho padrão
  }
  migrarDados(antigo, destino);
  app.setPath("userData", destino);
  try { app.setPath("sessionData", destino); } catch (e) {}
}

// Na primeira vez em modo portátil, traz o que já existia no AppData
// pra pessoa não abrir o app e achar que perdeu tudo.
function migrarDados(antigo, destino) {
  const marca = path.join(destino, ".migrado");
  if (fs.existsSync(marca) || !fs.existsSync(antigo)) return;
  // só o que importa: caches ficam pra trás, o app refaz sozinho
  for (const item of ["Local Storage", "IndexedDB", "Local State", "google-drive-session.json"]) {
    const de = path.join(antigo, item);
    if (!fs.existsSync(de)) continue;
    try { fs.cpSync(de, path.join(destino, item), { recursive: true }); } catch (e) {}
  }
  try { fs.writeFileSync(marca, new Date().toISOString()); } catch (e) {}
}

tornarPortatil();

function loadLocalSecrets() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "secrets.local.json"), "utf8"));
  } catch (e) {
    return {};
  }
}

function tokenFilePath() {
  return path.join(app.getPath("userData"), "google-drive-session.json");
}

function loadDesktopSession() {
  try { return JSON.parse(fs.readFileSync(tokenFilePath(), "utf8")); }
  catch (e) { return {}; }
}

function saveDesktopSession(tokens, clientId) {
  const previous = loadDesktopSession();
  const session = {
    clientId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || previous.refresh_token || null,
    expires_at: Date.now() + (Number(tokens.expires_in) || 3600) * 1000 - 60000,
  };
  fs.writeFileSync(tokenFilePath(), JSON.stringify(session), { encoding: "utf8", mode: 0o600 });
  return session;
}

function clearDesktopSession() {
  try { fs.unlinkSync(tokenFilePath()); } catch (e) {}
}

async function restoreDesktopSession(clientId) {
  const session = loadDesktopSession();
  if (!session.access_token || session.clientId !== clientId) return null;
  if (Date.now() < Number(session.expires_at || 0)) {
    return { access_token: session.access_token, expires_in: Math.max(60, Math.floor((session.expires_at - Date.now()) / 1000) + 60) };
  }
  if (!session.refresh_token) return null;
  const body = new URLSearchParams({ client_id: clientId, refresh_token: session.refresh_token, grant_type: "refresh_token" });
  const secret = loadLocalSecrets().googleDesktopClientSecret;
  if (secret) body.set("client_secret", secret);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    signal: AbortSignal.timeout(15000),
  });
  const tokens = await response.json().catch(() => ({}));
  if (!response.ok || !tokens.access_token) { clearDesktopSession(); return null; }
  saveDesktopSession(tokens, clientId);
  return tokens;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 390,
    minHeight: 640,
    title: "Faísca",
    icon: path.join(__dirname, "..", "icons", "faisca.ico"),
    backgroundColor: "#f3f1ec",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  await win.webContents.session.clearStorageData({
    storages: ["serviceworkers", "cachestorage"],
  }).catch(() => {});
  win.loadURL(APP_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL) || url.startsWith("https://accounts.google.com/")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function base64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function desktopOAuth({ clientId, scope, selectAccount }, sender) {
  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const state = base64url(crypto.randomBytes(18));

  return await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://127.0.0.1");
        if (url.pathname !== "/callback") return;
        if (url.searchParams.get("state") !== state) throw new Error("Estado OAuth invÃ¡lido.");
        const code = url.searchParams.get("code");
        if (!code) throw new Error("AutorizaÃ§Ã£o nÃ£o concluÃ­da.");
        const successPage = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fa&iacute;sca conectado</title>
  <style>
    :root { color-scheme: light dark; --accent:#e8452a; --accent2:#ff7a42; --bg:#f3f1ec; --text:#1d1a16; --dim:#6a6357; --card:#fff; --border:#e6e0d5; }
    @media (prefers-color-scheme: dark) { :root { --bg:#16151a; --text:#f1eee8; --dim:#a49c96; --card:#201e26; --border:#302d38; } }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      color: var(--text);
      background: radial-gradient(900px 420px at 70% -10%, rgba(255,122,66,.18), transparent 60%), var(--bg);
    }
    .card {
      width: min(420px, 100%); padding: 28px; border-radius: 18px; background: var(--card);
      border: 1px solid var(--border); box-shadow: 0 18px 50px rgba(50,25,10,.16), 0 4px 14px rgba(60,35,15,.08);
      text-align: center;
    }
    .mark {
      width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 16px;
      display: grid; place-items: center; color: #fff; font-size: 34px; font-weight: 900;
      background: linear-gradient(135deg, var(--accent2), var(--accent));
      box-shadow: 0 10px 24px rgba(232,69,42,.28);
    }
    h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.15; }
    p { margin: 0; color: var(--dim); font-size: 15px; line-height: 1.55; }
    .hint { margin-top: 18px; font-size: 13px; }
    .note {
      margin-top: 22px; border: 0; border-radius: 12px; padding: 12px 16px; min-width: 160px;
      display: inline-block; color: #fff; font-weight: 750; font-size: 14px;
      background: linear-gradient(135deg, var(--accent2), var(--accent));
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="mark">&#9889;</div>
    <h1>Fa&iacute;sca conectado</h1>
    <p>Seu Google Drive foi conectado com sucesso. Voc&ecirc; j&aacute; pode voltar para o aplicativo.</p>
    <p class="hint">Voc&ecirc; pode fechar esta aba manualmente.</p>
    <span class="note">Volte para o Fa&iacute;sca</span>
  </main>
</body>
</html>`;

        const body = new URLSearchParams({
          client_id: clientId,
          code,
          code_verifier: verifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        });
        const secret = loadLocalSecrets().googleDesktopClientSecret;
        if (secret) body.set("client_secret", secret);
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal: AbortSignal.timeout(15000),
        });
        const tokenJson = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok) {
          const detail = tokenJson.error_description || tokenJson.error || "Falha ao concluir login no Google.";
          throw new Error(detail);
        }
        saveDesktopSession(tokenJson, clientId);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(successPage);
        server.close();
        resolve(tokenJson);
      } catch (err) {
        if (!res.headersSent) {
          const message = String(err && err.message ? err.message : "Falha ao concluir login.");
          res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Falha no login</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#16151a;color:#f1eee8;font:16px system-ui;padding:24px}.box{max-width:520px;padding:28px;background:#201e26;border:1px solid #393540;border-radius:12px}h1{font-size:22px;margin:0 0 12px;color:#ff6847}p{line-height:1.55;color:#c2bac2;overflow-wrap:anywhere}</style></head><body><main class="box"><h1>N&atilde;o foi poss&iacute;vel conectar</h1><p>${message.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]))}</p><p>Volte ao Fa&iacute;sca e tente novamente.</p></main></body></html>`);
        }
        try { server.close(); } catch (e) {}
        reject(err);
      }
    });

    let redirectUri;
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      redirectUri = `http://127.0.0.1:${port}/callback`;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scope);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", selectAccount ? "select_account consent" : "consent");
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", state);
      shell.openExternal(authUrl.toString());
    });

    server.on("error", reject);
    setTimeout(() => {
      try { server.close(); } catch (e) {}
      reject(new Error("Tempo esgotado no login do Google."));
    }, 180000);
  });
}

ipcMain.handle("oauth:connect", async (event, args) => {
  try {
    const result = await desktopOAuth(args, event.sender);
    if (!event.sender.isDestroyed()) event.sender.send("oauth:result", { ok: true, token: result });
    return result;
  } catch (error) {
    if (!event.sender.isDestroyed()) event.sender.send("oauth:result", { ok: false, message: error.message });
    throw error;
  }
});

ipcMain.handle("oauth:restore", (_event, { clientId }) => restoreDesktopSession(clientId));
ipcMain.handle("oauth:disconnect", () => { clearDesktopSession(); return true; });

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

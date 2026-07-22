const { app, BrowserWindow, ipcMain, shell } = require("electron");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const APP_URL = "https://randomicidio.github.io/faisca/";

function loadLocalSecrets() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "secrets.local.json"), "utf8"));
  } catch (e) {
    return {};
  }
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

async function desktopOAuth({ clientId, scope }) {
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
        });
        const tokenJson = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok) {
          const detail = tokenJson.error_description || tokenJson.error || "Falha ao concluir login no Google.";
          throw new Error(detail);
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(successPage);
        server.close();
        resolve(tokenJson);
      } catch (err) {
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
      authUrl.searchParams.set("access_type", "online");
      authUrl.searchParams.set("prompt", "consent");
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

ipcMain.handle("oauth:connect", (_event, args) => desktopOAuth(args));

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

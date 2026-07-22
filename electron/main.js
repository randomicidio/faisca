const { app, BrowserWindow, ipcMain, shell } = require("electron");
const crypto = require("crypto");
const http = require("http");
const path = require("path");

const APP_URL = "https://randomicidio.github.io/faisca/";

function createWindow() {
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
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h2>FaÃ­sca conectado.</h2><p>VocÃª jÃ¡ pode voltar para o aplicativo.</p>");
        server.close();

        const body = new URLSearchParams({
          client_id: clientId,
          code,
          code_verifier: verifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        });
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!tokenRes.ok) throw new Error("Falha ao concluir login no Google.");
        resolve(await tokenRes.json());
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

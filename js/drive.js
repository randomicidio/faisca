// ============================================================
//  FAÍSCA — Sincronização com o Google Drive
//  Usa o escopo drive.file: o app só enxerga o próprio arquivo
//  que ele cria. Nada mais do Drive da pessoa é acessado.
// ============================================================
(function () {
  const CFG = window.FAISCA_CONFIG || {};
  const LS_FILE = "faisca:drive:fileId";
  const LS_FLAG = "faisca:drive:connected";
  const LS_USER = "faisca:drive:user";
  const LS_APP_FOLDER = "faisca:drive:appFolderId";

  let tokenClient = null;
  let accessToken = null;
  let tokenExpiry = 0;
  let pendingResolve = null;
  let pendingReject = null;
  let gisReady = false;

  const available = () => !!(CFG.GOOGLE_CLIENT_ID && CFG.GOOGLE_CLIENT_ID.trim());

  function waitForGIS() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.oauth2) return resolve();
      let tries = 0;
      const t = setInterval(() => {
        if (window.google && google.accounts && google.accounts.oauth2) { clearInterval(t); resolve(); }
        else if (++tries > 60) { clearInterval(t); reject(new Error("Google não carregou. Verifique sua conexão.")); }
      }, 100);
    });
  }

  async function initClient() {
    if (tokenClient) return;
    await waitForGIS();
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.GOOGLE_CLIENT_ID.trim(),
      scope: CFG.DRIVE_SCOPE,
      callback: (resp) => {
        if (acceptToken(resp)) {
          if (pendingResolve) pendingResolve(accessToken);
        } else if (pendingReject) {
          pendingReject(new Error("Autorização não concluída."));
        }
        pendingResolve = pendingReject = null;
      },
      error_callback: (err) => {
        if (pendingReject) pendingReject(new Error(err && err.type ? err.type : "Autorização cancelada."));
        pendingResolve = pendingReject = null;
      },
    });
    gisReady = true;
  }

  function requestToken(interactive) {
    return new Promise((resolve, reject) => {
      pendingResolve = resolve; pendingReject = reject;
      try {
        tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" });
      } catch (e) { pendingResolve = pendingReject = null; reject(e); }
    });
  }

  async function ensureToken(interactive) {
    await initClient();
    if (accessToken && Date.now() < tokenExpiry) return accessToken;
    if (!interactive) throw new Error("Login necessario para sincronizar.");
    return requestToken(!!interactive);
  }

  function acceptToken(resp) {
    if (!resp || !resp.access_token) return false;
    accessToken = resp.access_token;
    tokenExpiry = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3600 * 1000) - 60000;
    localStorage.setItem(LS_FLAG, "1");
    window.dispatchEvent(new CustomEvent("faisca:drive-state", { detail: { connected: true } }));
    return true;
  }

  if (window.FaiscaDesktopOAuth && window.FaiscaDesktopOAuth.onResult) {
    window.FaiscaDesktopOAuth.onResult((result) => {
      if (result && result.ok && acceptToken(result.token)) {
        window.dispatchEvent(new CustomEvent("faisca:drive-desktop-result", { detail: { ok: true } }));
      } else if (result && !result.ok) {
        window.dispatchEvent(new CustomEvent("faisca:drive-desktop-result", {
          detail: { ok: false, message: result.message || "Falha ao conectar com o Google." },
        }));
      }
    });
  }

  async function api(url, opts = {}) {
    const token = await ensureToken(false);
    opts.headers = Object.assign({ Authorization: "Bearer " + token }, opts.headers || {});
    let res = await fetch(url, opts);
    if (res.status === 401) {
      // token expirou — pede de novo (silencioso) e repete
      accessToken = null;
      const t2 = await ensureToken(false);
      opts.headers.Authorization = "Bearer " + t2;
      res = await fetch(url, opts);
    }
    return res;
  }

  async function findFileId() {
    const cached = localStorage.getItem(LS_FILE);
    const appFolder = await ensureAppFolder();
    if (cached) {
      await moveFileToFolder(cached, appFolder).catch(() => {});
      return cached;
    }
    const q = encodeURIComponent(`name='${CFG.DRIVE_FILE_NAME}' and '${appFolder}' in parents and trashed=false`);
    const res = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,modifiedTime)`);
    if (!res.ok) throw new Error("Não consegui buscar o arquivo no Drive.");
    const data = await res.json();
    if (data.files && data.files.length) {
      localStorage.setItem(LS_FILE, data.files[0].id);
      return data.files[0].id;
    }
    const oldQ = encodeURIComponent(`name='${CFG.DRIVE_FILE_NAME}' and trashed=false`);
    const oldRes = await api(`https://www.googleapis.com/drive/v3/files?q=${oldQ}&spaces=drive&fields=files(id,modifiedTime)`);
    if (!oldRes.ok) throw new Error("NÃ£o consegui buscar o arquivo no Drive.");
    const oldData = await oldRes.json();
    if (oldData.files && oldData.files.length) {
      const id = oldData.files[0].id;
      await moveFileToFolder(id, appFolder).catch(() => {});
      localStorage.setItem(LS_FILE, id);
      return id;
    }
    return null;
  }

  async function createFile(contentObj) {
    const boundary = "faisca_" + Math.random().toString(36).slice(2);
    const appFolder = await ensureAppFolder();
    const metadata = { name: CFG.DRIVE_FILE_NAME, mimeType: "application/json", parents: [appFolder] };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      JSON.stringify(contentObj) +
      `\r\n--${boundary}--`;
    const res = await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error("Não consegui criar o arquivo no Drive.");
    const data = await res.json();
    localStorage.setItem(LS_FILE, data.id);
    return data.id;
  }

  async function updateFile(fileId, contentObj) {
    const res = await api(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contentObj),
    });
    if (res.status === 404) { localStorage.removeItem(LS_FILE); return null; }
    if (!res.ok) throw new Error("Não consegui salvar no Drive.");
    return fileId;
  }

  async function fetchUserEmail() {
    try {
      const res = await api("https://www.googleapis.com/oauth2/v3/userinfo").catch(() => null);
      if (res && res.ok) { const u = await res.json(); return u.email || u.name || ""; }
    } catch (e) {}
    return "";
  }

  // ---- API pública ----
  const Drive = {
    available,
    isConnected: () => !!accessToken && Date.now() < tokenExpiry,
    wasConnected: () => localStorage.getItem(LS_FLAG) === "1",
    user: () => localStorage.getItem(LS_USER) || "",

    async connect() {
      if (window.FaiscaDesktopOAuth && CFG.GOOGLE_DESKTOP_CLIENT_ID && CFG.GOOGLE_DESKTOP_CLIENT_ID.trim()) {
        const resp = await window.FaiscaDesktopOAuth.connect({
          clientId: CFG.GOOGLE_DESKTOP_CLIENT_ID.trim(),
          scope: CFG.DRIVE_SCOPE,
        });
        if (!acceptToken(resp)) throw new Error("AutorizaÃ§Ã£o nÃ£o concluÃ­da.");
        const email = await fetchUserEmail();
        if (email) localStorage.setItem(LS_USER, email);
        return email;
      }
      await initClient();
      await ensureToken(true);
      const email = await fetchUserEmail();
      if (email) localStorage.setItem(LS_USER, email);
      return email;
    },

    async reconnectSilently() {
      if (!available() || !this.wasConnected()) return false;
      try { return this.isConnected(); }
      catch (e) { return false; }
    },

    disconnect() {
      try { if (accessToken && window.google) google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) {}
      accessToken = null; tokenExpiry = 0;
      localStorage.removeItem(LS_FLAG);
      localStorage.removeItem(LS_FILE);
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_APP_FOLDER);
      window.dispatchEvent(new CustomEvent("faisca:drive-state", { detail: { connected: false } }));
    },

    // Lê o objeto salvo no Drive (ou null se ainda não existe)
    async pull() {
      const id = await findFileId();
      if (!id) return null;
      const res = await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
      if (res.status === 404) { localStorage.removeItem(LS_FILE); return null; }
      if (!res.ok) throw new Error("Não consegui ler os dados do Drive.");
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) { return null; }
    },

    // Grava o objeto no Drive (cria o arquivo se preciso)
    async push(obj) {
      let id = await findFileId();
      if (!id) return createFile(obj);
      const r = await updateFile(id, obj);
      if (!r) return createFile(obj);
      return r;
    },

    // ---- Mídia em subpastas ----
    ensureIdeaFolder,
    async uploadMedia(folderId, blob, filename, mime) {
      const boundary = "fm_" + Math.random().toString(36).slice(2);
      const meta = JSON.stringify({ name: filename, parents: [folderId] });
      const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime || "application/octet-stream"}\r\n\r\n`;
      const tail = `\r\n--${boundary}--`;
      const body = new Blob([head, blob, tail]);
      const res = await api(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`, {
        method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body,
      });
      if (!res.ok) throw new Error("Falha ao enviar mídia ao Drive.");
      return (await res.json()).id;
    },
    async getMediaBlob(fileId) {
      const res = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      if (!res.ok) return null;
      return res.blob();
    },
    async trash(fileId) {
      try {
        await api(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }),
        });
      } catch (e) {}
    },
  };

  // pasta raiz do app no Drive
  async function ensureAppFolder() {
    const cached = localStorage.getItem(LS_APP_FOLDER);
    if (cached) return cached;
    const q = encodeURIComponent("name='Faísca' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const res = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id)`);
    if (res.ok) { const d = await res.json(); if (d.files && d.files.length) { localStorage.setItem(LS_APP_FOLDER, d.files[0].id); return d.files[0].id; } }
    const cr = await api("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Faísca", mimeType: "application/vnd.google-apps.folder" }),
    });
    if (!cr.ok) throw new Error("Não consegui criar a pasta Faísca no Drive.");
    const id = (await cr.json()).id;
    localStorage.setItem(LS_APP_FOLDER, id);
    return id;
  }
  function sanitizeName(s) { return (String(s || "").replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 80)) || "Ideia sem título"; }
  async function moveFileToFolder(fileId, folderId) {
    const info = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents,trashed`);
    if (!info.ok) return;
    const file = await info.json();
    if (file.trashed || (file.parents || []).includes(folderId)) return;
    const removeParents = encodeURIComponent((file.parents || []).join(","));
    const suffix = removeParents ? `&removeParents=${removeParents}` : "";
    await api(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(folderId)}${suffix}&fields=id,parents`, {
      method: "PATCH",
    });
  }
  async function ensureIdeaFolder(title, existingId) {
    if (existingId) {
      const chk = await api(`https://www.googleapis.com/drive/v3/files/${existingId}?fields=id,trashed`);
      if (chk.ok) { const d = await chk.json(); if (!d.trashed) return existingId; }
    }
    const app = await ensureAppFolder();
    const cr = await api("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sanitizeName(title), mimeType: "application/vnd.google-apps.folder", parents: [app] }),
    });
    if (!cr.ok) throw new Error("Não consegui criar a subpasta no Drive.");
    return (await cr.json()).id;
  }

  window.Drive = Drive;
})();

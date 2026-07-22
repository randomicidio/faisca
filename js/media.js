// ============================================================
//  FAÍSCA — Blobs de mídia (arquivos) no aparelho (IndexedDB)
//  Só os ARQUIVOS ficam aqui, por serem pesados. Os metadados
//  (nome, tipo, ordem) vivem junto da ideia e sincronizam pelo Drive.
// ============================================================
(function () {
  const DB_NAME = "faisca-media";
  const STORE = "clips";
  let dbp = null;

  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("ideaId", "ideaId", { unique: false });
        }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode) { return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE)); }
  function reqP(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }

  async function init() { try { await openDB(); } catch (e) { console.warn("Mídia indisponível", e); } }

  // guarda o arquivo (blob). extra: metadados úteis p/ migração (ideaId, kind, name...)
  async function put(id, blob, extra) {
    try { const os = await tx("readwrite"); await reqP(os.put(Object.assign({ id, blob }, extra || {}))); return true; }
    catch (e) { return false; }
  }
  async function get(id) {
    try { const os = await tx("readonly"); const r = await reqP(os.get(id)); return r ? r.blob : null; }
    catch (e) { return null; }
  }
  async function has(id) {
    try { const os = await tx("readonly"); const r = await reqP(os.getKey ? os.getKey(id) : os.get(id)); return !!r; }
    catch (e) { return false; }
  }
  async function del(id) { try { const os = await tx("readwrite"); await reqP(os.delete(id)); } catch (e) {} }
  async function delMany(ids) { for (const id of ids || []) await del(id); }
  async function allRecords() {
    try { const os = await tx("readonly"); return await reqP(os.getAll()); } catch (e) { return []; }
  }

  window.MediaStore = { init, put, get, has, del, delMany, allRecords };
})();

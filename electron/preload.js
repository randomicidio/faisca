const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FaiscaDesktopOAuth", {
  connect: ({ clientId, scope, selectAccount }) => ipcRenderer.invoke("oauth:connect", { clientId, scope, selectAccount }),
  onResult: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on("oauth:result", listener);
    return () => ipcRenderer.removeListener("oauth:result", listener);
  },
});

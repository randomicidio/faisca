const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FaiscaDesktopOAuth", {
  connect: ({ clientId, scope }) => ipcRenderer.invoke("oauth:connect", { clientId, scope }),
  onResult: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on("oauth:result", listener);
    return () => ipcRenderer.removeListener("oauth:result", listener);
  },
});

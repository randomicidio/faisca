const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FaiscaDesktopOAuth", {
  connect: ({ clientId, scope }) => ipcRenderer.invoke("oauth:connect", { clientId, scope }),
});

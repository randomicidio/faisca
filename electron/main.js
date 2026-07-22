const { app, BrowserWindow, shell } = require("electron");

const APP_URL = "https://randomicidio.github.io/faisca/";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 390,
    minHeight: 640,
    title: "Faísca",
    backgroundColor: "#f3f1ec",
    autoHideMenuBar: true,
    webPreferences: {
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

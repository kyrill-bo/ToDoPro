import { app, ipcMain, BrowserWindow, nativeImage, Tray, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const userDataPath = app.getPath("userData");
const DB_FILE = path.join(userDataPath, "db.json");
let tray = null;
let win = null;
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2));
  }
}
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ToDo Pro",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset"
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  win.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
    }
    return false;
  });
}
function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "ToDo Pro öffnen", click: () => win == null ? void 0 : win.show() },
    { type: "separator" },
    { label: "Beenden", click: () => {
      app.isQuitting = true;
      app.quit();
    } }
  ]);
  tray.setToolTip("ToDo Pro");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    (win == null ? void 0 : win.isVisible()) ? win.hide() : win == null ? void 0 : win.show();
  });
}
ipcMain.handle("get-data", () => {
  try {
    initDB();
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to read DB:", e);
    return { projects: [], boards: [] };
  }
});
ipcMain.handle("save-data", (event, data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (e) {
    console.error("Failed to save DB:", e);
    return { success: false };
  }
});
app.whenReady().then(() => {
  initDB();
  createWindow();
  createTray();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

import { app, ipcMain, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const userDataPath = app.getPath("userData");
const DB_FILE = path.join(userDataPath, "db.json");
let win = null;
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("Initializing fresh DB at:", DB_FILE);
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2));
  } else {
    console.log("Database found at:", DB_FILE);
  }
}
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "ToDo Pro",
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: "#000000"
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url !== (win == null ? void 0 : win.webContents.getURL())) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.on("closed", () => {
    win = null;
  });
}
ipcMain.on("window-minimize", () => win == null ? void 0 : win.minimize());
ipcMain.on("window-maximize", () => {
  if (win == null ? void 0 : win.isMaximized()) {
    win.unmaximize();
  } else {
    win == null ? void 0 : win.maximize();
  }
});
ipcMain.on("window-close", () => win == null ? void 0 : win.close());
ipcMain.handle("get-data", () => {
  try {
    initDB();
    const data = fs.readFileSync(DB_FILE, "utf8");
    console.log("Data fetched from DB.");
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to read DB:", e);
    return { projects: [], boards: [] };
  }
});
ipcMain.handle("save-data", (event, data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    console.log("Data successfully committed to disk.");
    return { success: true };
  } catch (e) {
    console.error("Failed to save DB:", e);
    return { success: false };
  }
});
app.whenReady().then(() => {
  initDB();
  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

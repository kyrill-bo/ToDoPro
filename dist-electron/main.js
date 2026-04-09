import { app, ipcMain, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const userDataPath = app.getPath("userData");
const DB_FILE = path.join(userDataPath, "db.json");
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2));
  }
}
function createWindow() {
  const win = new BrowserWindow({
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
    // Modern Mac look
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
}
ipcMain.handle("get-data", () => {
  initDB();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
});
ipcMain.handle("save-data", (event, data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  return { success: true };
});
app.whenReady().then(() => {
  initDB();
  createWindow();
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

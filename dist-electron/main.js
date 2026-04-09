import { app as n, ipcMain as i, BrowserWindow as c, shell as l } from "electron";
import s from "path";
import { fileURLToPath as u } from "url";
import r from "fs";
const p = u(import.meta.url), h = s.dirname(p), g = n.getPath("userData"), o = s.join(g, "db.json");
let e = null;
function d() {
  r.existsSync(o) ? console.log("Database found at:", o) : (console.log("Initializing fresh DB at:", o), r.writeFileSync(o, JSON.stringify({ projects: [], boards: [] }, null, 2)));
}
function m() {
  e = new c({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "ToDo Pro",
    frame: !1,
    transparent: !0,
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1
    },
    backgroundColor: "#000000"
  }), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile(s.join(h, "../dist/index.html")), e.webContents.setWindowOpenHandler(({ url: t }) => (l.openExternal(t), { action: "deny" })), e.webContents.on("will-navigate", (t, a) => {
    a !== (e == null ? void 0 : e.webContents.getURL()) && (t.preventDefault(), l.openExternal(a));
  }), e.on("closed", () => {
    e = null;
  });
}
i.on("window-minimize", () => e == null ? void 0 : e.minimize());
i.on("window-maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
i.on("window-close", () => e == null ? void 0 : e.close());
i.handle("get-data", () => {
  try {
    d();
    const t = r.readFileSync(o, "utf8");
    return console.log("Data fetched from DB."), JSON.parse(t);
  } catch (t) {
    return console.error("Failed to read DB:", t), { projects: [], boards: [] };
  }
});
i.handle("save-data", (t, a) => {
  try {
    return r.writeFileSync(o, JSON.stringify(a, null, 2)), console.log("Data successfully committed to disk."), { success: !0 };
  } catch (f) {
    return console.error("Failed to save DB:", f), { success: !1 };
  }
});
n.whenReady().then(() => {
  d(), m();
});
n.on("window-all-closed", () => {
  process.platform !== "darwin" && n.quit();
});
n.on("activate", () => {
  c.getAllWindows().length === 0 && m();
});

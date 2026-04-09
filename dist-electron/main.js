import { app as o, ipcMain as n, BrowserWindow as c, shell as f, nativeImage as p, Tray as h, Menu as y } from "electron";
import l from "path";
import { fileURLToPath as g } from "url";
import r from "fs";
const D = g(import.meta.url), E = l.dirname(D), T = o.getPath("userData"), a = l.join(T, "db.json");
let i = null, e = null;
function d() {
  r.existsSync(a) || r.writeFileSync(a, JSON.stringify({ projects: [], boards: [] }, null, 2));
}
function u() {
  e = new c({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "ToDo Pro",
    frame: !1,
    // Remove native title bar and borders
    transparent: !0,
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1
    },
    backgroundColor: "#000000"
  }), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile(l.join(E, "../dist/index.html")), e.webContents.setWindowOpenHandler(({ url: t }) => (f.openExternal(t), { action: "deny" })), e.on("close", (t) => (o.isQuitting || (t.preventDefault(), e == null || e.hide()), !1));
}
n.on("window-minimize", () => e == null ? void 0 : e.minimize());
n.on("window-maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
n.on("window-close", () => e == null ? void 0 : e.close());
n.handle("get-data", () => {
  try {
    d();
    const t = r.readFileSync(a, "utf8");
    return JSON.parse(t);
  } catch (t) {
    return console.error("Failed to read DB:", t), { projects: [], boards: [] };
  }
});
n.handle("save-data", (t, s) => {
  try {
    return r.writeFileSync(a, JSON.stringify(s, null, 2)), { success: !0 };
  } catch (m) {
    return console.error("Failed to save DB:", m), { success: !1 };
  }
});
function _() {
  const t = p.createEmpty();
  i = new h(t);
  const s = y.buildFromTemplate([
    { label: "ToDo Pro öffnen", click: () => e == null ? void 0 : e.show() },
    { type: "separator" },
    { label: "Beenden", click: () => {
      o.isQuitting = !0, o.quit();
    } }
  ]);
  i.setToolTip("ToDo Pro"), i.setContextMenu(s), i.on("click", () => {
    e != null && e.isVisible() ? e.hide() : e == null || e.show();
  });
}
o.whenReady().then(() => {
  d(), u(), _();
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
o.on("activate", () => {
  c.getAllWindows().length === 0 && u();
});

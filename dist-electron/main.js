import { app as e, ipcMain as r, BrowserWindow as a } from "electron";
import o from "path";
import { fileURLToPath as c } from "url";
import t from "fs";
const f = c(import.meta.url), u = o.dirname(f), m = e.getPath("userData"), n = o.join(m, "db.json");
function s() {
  t.existsSync(n) || t.writeFileSync(n, JSON.stringify({ projects: [], boards: [] }, null, 2));
}
function l() {
  const i = new a({
    width: 1280,
    height: 800,
    title: "ToDo Pro",
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1
    },
    backgroundColor: "#000000",
    autoHideMenuBar: !0,
    titleBarStyle: "hiddenInset"
    // Modern Mac look
  });
  process.env.VITE_DEV_SERVER_URL ? i.loadURL(process.env.VITE_DEV_SERVER_URL) : i.loadFile(o.join(u, "../dist/index.html"));
}
r.handle("get-data", () => (s(), JSON.parse(t.readFileSync(n, "utf8"))));
r.handle("save-data", (i, d) => (t.writeFileSync(n, JSON.stringify(d, null, 2)), { success: !0 }));
e.whenReady().then(() => {
  s(), l();
});
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
e.on("activate", () => {
  a.getAllWindows().length === 0 && l();
});

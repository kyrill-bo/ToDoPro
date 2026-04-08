import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Database path in the user's data directory (independent from source folder)
const userDataPath = app.getPath('userData')
const DB_FILE = path.join(userDataPath, 'db.json')

// Init DB file if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2))
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'ToDo Pro',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset', // Modern Mac look
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC Handlers for direct file access (if we bypass the express server in prod)
ipcMain.handle('get-data', () => {
  initDB()
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
})

ipcMain.handle('save-data', (event, data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  return { success: true }
})

app.whenReady().then(() => {
  initDB()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

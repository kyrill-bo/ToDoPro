import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Persistent Data Path
const userDataPath = app.getPath('userData')
const DB_FILE = path.join(userDataPath, 'db.json')

let win: BrowserWindow | null = null

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('Initializing fresh DB at:', DB_FILE)
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2))
  } else {
    console.log('Database found at:', DB_FILE)
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'ToDo Pro',
    frame: false, 
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#000000',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win?.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  win.on('closed', () => {
    win = null
  })
}

// Window Control Handlers
ipcMain.on('window-minimize', () => win?.minimize())
ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})
ipcMain.on('window-close', () => win?.close())

// IPC Handlers for direct file access
ipcMain.handle('get-data', () => {
  try {
    initDB()
    const data = fs.readFileSync(DB_FILE, 'utf8')
    console.log('Data fetched from DB.')
    return JSON.parse(data)
  } catch (e) {
    console.error('Failed to read DB:', e)
    return { projects: [], boards: [] }
  }
})

ipcMain.handle('save-data', (event, data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
    console.log('Data successfully committed to disk.')
    return { success: true }
  } catch (e) {
    console.error('Failed to save DB:', e)
    return { success: false }
  }
})

app.whenReady().then(() => {
  initDB()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

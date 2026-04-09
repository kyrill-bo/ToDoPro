import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const userDataPath = app.getPath('userData')
const DB_FILE = path.join(userDataPath, 'db.json')

let tray: Tray | null = null
let win: BrowserWindow | null = null

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ projects: [], boards: [] }, null, 2))
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'ToDo Pro',
    frame: false, // Remove native title bar and borders
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

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      win?.hide()
    }
    return false
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
    return JSON.parse(data)
  } catch (e) {
    console.error('Failed to read DB:', e)
    return { projects: [], boards: [] }
  }
})

ipcMain.handle('save-data', (event, data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
    return { success: true }
  } catch (e) {
    console.error('Failed to save DB:', e)
    return { success: false }
  }
})

function createTray() {
  const icon = nativeImage.createEmpty() 
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'ToDo Pro öffnen', click: () => win?.show() },
    { type: 'separator' },
    { label: 'Beenden', click: () => {
      app.isQuitting = true
      app.quit()
    }}
  ])
  tray.setToolTip('ToDo Pro')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    win?.isVisible() ? win.hide() : win?.show()
  })
}

app.whenReady().then(() => {
  initDB()
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

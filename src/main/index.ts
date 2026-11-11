import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { warmBackdropWindow } from './backdrop-window'
import { warmCaptureWindow } from './capture-window'
import { registerIpc } from './ipc'
import { startContextTracker } from './context-tracker'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { broadcastTheme, getWindowBackgroundColor, initTheme, setMainWindow } from './theme'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Up to Speed',
    backgroundColor: getWindowBackgroundColor(),
    autoHideMenuBar: true,
    trafficLightPosition: { x: 16, y: 18 },
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      spellcheck: false
    }
  })

  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    broadcastTheme()
  })

  mainWindow.on('closed', () => {
    setMainWindow(null)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  initTheme()
  registerIpc()
  startContextTracker()
  registerGlobalShortcuts()
  createWindow()
  warmCaptureWindow()
  warmBackdropWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

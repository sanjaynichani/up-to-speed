import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { sendThemeToWindow } from './theme'

let backdropWindow: BrowserWindow | null = null
let backdropWindowReady: Promise<void> | null = null
let pendingBackdropImage: string | null = null

function backdropWindowUrl(): string {
  if (!process.env['ELECTRON_RENDERER_URL']) {
    return join(__dirname, '../renderer/backdrop.html')
  }
  return `${process.env['ELECTRON_RENDERER_URL']}/backdrop.html`
}

function combinedDisplayBounds(): Electron.Rectangle {
  const displays = screen.getAllDisplays()
  let x = displays[0]?.bounds.x ?? 0
  let y = displays[0]?.bounds.y ?? 0
  let right = x + (displays[0]?.bounds.width ?? 0)
  let bottom = y + (displays[0]?.bounds.height ?? 0)

  for (const display of displays) {
    x = Math.min(x, display.bounds.x)
    y = Math.min(y, display.bounds.y)
    right = Math.max(right, display.bounds.x + display.bounds.width)
    bottom = Math.max(bottom, display.bounds.y + display.bounds.height)
  }

  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  }
}

function createBackdropWindow(): BrowserWindow {
  const bounds = combinedDisplayBounds()

  const window = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    title: 'Capture backdrop',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  window.setAlwaysOnTop(true, 'floating')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  window.on('closed', () => {
    backdropWindow = null
    backdropWindowReady = null
  })

  backdropWindowReady = new Promise((resolve) => {
    window.webContents.once('did-finish-load', () => {
      sendThemeToWindow(window)
      if (pendingBackdropImage) {
        window.webContents.send('backdrop:image', pendingBackdropImage)
      }
      resolve()
    })
  })

  const url = backdropWindowUrl()
  if (url.startsWith('http')) {
    void window.loadURL(url)
  } else {
    void window.loadFile(url)
  }

  return window
}

export function warmBackdropWindow(): void {
  if (backdropWindow && !backdropWindow.isDestroyed()) {
    return
  }
  backdropWindow = createBackdropWindow()
}

async function showBackdropWindow(imageDataUrl?: string | null): Promise<void> {
  pendingBackdropImage = imageDataUrl ?? null

  if (!backdropWindow || backdropWindow.isDestroyed()) {
    backdropWindow = createBackdropWindow()
  }

  if (backdropWindowReady) {
    await backdropWindowReady
  }

  const bounds = combinedDisplayBounds()
  backdropWindow.setBounds(bounds)

  if (process.platform === 'darwin') {
    if (imageDataUrl) {
      backdropWindow.setVibrancy(null)
    } else {
      backdropWindow.setVibrancy('under-window')
    }
  }

  if (imageDataUrl) {
    backdropWindow.webContents.send('backdrop:image', imageDataUrl)
  }

  backdropWindow.showInactive()
}

export function hideBackdropWindow(): void {
  pendingBackdropImage = null
  if (backdropWindow && !backdropWindow.isDestroyed()) {
    backdropWindow.hide()
  }
}

export async function openBackdrop(imageDataUrl?: string | null): Promise<void> {
  warmBackdropWindow()
  await showBackdropWindow(imageDataUrl)
}

export function closeBackdrop(): void {
  hideBackdropWindow()
}

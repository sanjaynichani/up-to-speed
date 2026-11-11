import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import type { ThemeMode } from '@shared/types'

let mainWindow: BrowserWindow | null = null

export function getThemeMode(): ThemeMode {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

export function getWindowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#282c34' : '#fafafa'
}

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

export function getMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }
  return null
}

function syncMainWindowBackground(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(getWindowBackgroundColor())
  }
}

export function broadcastTheme(): void {
  const theme = getThemeMode()
  syncMainWindowBackground()

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('theme:updated', theme)
    }
  }
}

export function sendThemeToWindow(window: BrowserWindow): void {
  if (!window.isDestroyed()) {
    window.webContents.send('theme:updated', getThemeMode())
  }
}

export function initTheme(): void {
  nativeTheme.themeSource = 'system'

  ipcMain.handle('theme:get', () => getThemeMode())

  nativeTheme.on('updated', () => {
    broadcastTheme()
  })
}

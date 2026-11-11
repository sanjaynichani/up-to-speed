import { BrowserWindow } from 'electron'
import type { AppState } from '@shared/types'
import { getCaptureWindow } from './capture-window'

export function broadcastState(state: AppState): void {
  const captureWindow = getCaptureWindow()

  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue
    }
    if (captureWindow && window.id === captureWindow.id) {
      continue
    }
    window.webContents.send('state:updated', state)
  }
}

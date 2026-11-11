import { globalShortcut } from 'electron'
import { toggleCaptureOverlay } from './capture-window'

let shortcutReady = false

export function registerGlobalShortcuts(): void {
  shortcutReady = globalShortcut.register('Alt+Space', () => {
    toggleCaptureOverlay()
  })

  if (!shortcutReady) {
    console.warn('Could not register Option+Space. It may be used by another app.')
  }
}

export function isShortcutRegistered(): boolean {
  return shortcutReady
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}

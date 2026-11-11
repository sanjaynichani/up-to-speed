import { execFileSync } from 'child_process'
import { getMainWindow } from './theme'

let restoreMainWindow = false

export function beginCaptureSession(): void {
  const main = getMainWindow()
  restoreMainWindow = Boolean(main && !main.isDestroyed() && main.isVisible())
  if (restoreMainWindow && main && !main.isDestroyed()) {
    main.hide()
  }
}

export function endCaptureSession(returnToApp = ''): void {
  const main = getMainWindow()
  if (restoreMainWindow && main && !main.isDestroyed()) {
    restoreMainWindow = false
    main.show()
    main.focus()
    return
  }
  restoreMainWindow = false

  if (returnToApp.trim() && process.platform === 'darwin') {
    const escaped = returnToApp.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      execFileSync('osascript', ['-e', `tell application "${escaped}" to activate`], { timeout: 2000 })
    } catch {
      // Best-effort — process name may differ from application name.
    }
  }
}

import type { CaptureContext } from './types'

export function suggestTitle(context: CaptureContext): string {
  if (context.windowTitle.trim()) {
    return context.windowTitle.trim().slice(0, 120)
  }
  if (context.url.trim()) {
    try {
      const hostname = new URL(context.url.trim()).hostname.replace(/^www\./, '')
      if (hostname) {
        return hostname
      }
    } catch {
      // A page without a usable URL still gets a title from the app name.
    }
  }
  if (context.appName.trim()) {
    return `Capture from ${context.appName.trim()}`
  }
  return 'Untitled capture'
}

/** Icon updates for an open capture must not wipe the note the user is typing. */
export function isSameCaptureSession(
  currentSessionId: string | undefined,
  nextSessionId: string | undefined
): boolean {
  return Boolean(currentSessionId && nextSessionId && currentSessionId === nextSessionId)
}

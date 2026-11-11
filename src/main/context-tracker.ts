import type { CaptureContext } from '@shared/types'
import { isOwnApp, readContextForApp, readFrontmostContext } from './context'
import { isCaptureOverlayOpen } from './capture-window'

const emptyContext: CaptureContext = {
  appName: '',
  windowTitle: '',
  url: ''
}

const IDLE_POLL_MS = 1000
const ACTIVE_POLL_MS = 400

let lastExternalContext: CaptureContext = emptyContext
let trackerStarted = false

function rememberExternalContext(context: CaptureContext): void {
  if (context.appName && !isOwnApp(context.appName)) {
    lastExternalContext = context
  }
}

function pollIntervalMs(): number {
  return isCaptureOverlayOpen() ? ACTIVE_POLL_MS : IDLE_POLL_MS
}

export function startContextTracker(): void {
  if (trackerStarted || process.platform !== 'darwin') {
    return
  }

  trackerStarted = true
  rememberExternalContext(readContextForApp(readFrontmostContext()))

  let timeout: NodeJS.Timeout | null = null

  const scheduleNextPoll = (): void => {
    timeout = setTimeout(() => {
      const frontmost = readFrontmostContext()
      if (frontmost.appName && !isOwnApp(frontmost.appName)) {
        rememberExternalContext(readContextForApp(frontmost))
      }
      scheduleNextPoll()
    }, pollIntervalMs())
  }

  scheduleNextPoll()

  process.on('exit', () => {
    if (timeout) {
      clearTimeout(timeout)
    }
  })
}

export function resolveCaptureContext(): CaptureContext {
  const frontmost = readFrontmostContext()

  if (frontmost.appName && !isOwnApp(frontmost.appName)) {
    lastExternalContext = frontmost
    return readContextForApp(frontmost)
  }

  if (lastExternalContext.appName) {
    return readContextForApp(lastExternalContext)
  }

  return emptyContext
}

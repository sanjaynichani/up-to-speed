import { randomUUID } from 'crypto'
import { BrowserWindow } from 'electron'
import { join } from 'path'
import type { CaptureContext } from '@shared/types'
import { closeBackdrop, openBackdrop } from './backdrop-window'
import { beginCaptureSession, endCaptureSession } from './capture-session'
import { resolveCaptureContext } from './context-tracker'
import { captureScreenBackdrop, screenCapturePermissionHint } from './screen-backdrop'
import { enrichCaptureContext, iconLabel } from './source-icon'
import { sendThemeToWindow } from './theme'

let captureWindow: BrowserWindow | null = null
let captureWindowReady: Promise<void> | null = null
let pendingContext: CaptureContext | null = null
let openGeneration = 0

function captureWindowUrl(): string {
  if (!process.env['ELECTRON_RENDERER_URL']) {
    return join(__dirname, '../renderer/capture.html')
  }
  return `${process.env['ELECTRON_RENDERER_URL']}/capture.html`
}

function createCaptureWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 520,
    height: 680,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'Quick capture',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false,
      spellcheck: false
    }
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  window.on('closed', () => {
    captureWindow = null
    captureWindowReady = null
  })

  captureWindowReady = new Promise((resolve) => {
    window.webContents.once('did-finish-load', () => {
      sendThemeToWindow(window)
      resolve()
    })
  })

  const url = captureWindowUrl()
  if (url.startsWith('http')) {
    void window.loadURL(url)
  } else {
    void window.loadFile(url)
  }

  return window
}

export function getCaptureWindow(): BrowserWindow | null {
  if (!captureWindow || captureWindow.isDestroyed()) {
    return null
  }
  return captureWindow
}

export function warmCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    return
  }
  captureWindow = createCaptureWindow()
}

export function getPendingCaptureContext(): CaptureContext {
  return (
    pendingContext ?? {
      appName: '',
      windowTitle: '',
      url: ''
    }
  )
}

function sendContextToOverlay(context: CaptureContext | null): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send('capture:context', context)
  }
}

async function revealCaptureOverlay(): Promise<void> {
  if (!captureWindow || captureWindow.isDestroyed()) {
    return
  }

  if (captureWindowReady) {
    await captureWindowReady
  }

  captureWindow.setAlwaysOnTop(true, 'screen-saver')
  sendContextToOverlay(pendingContext)
  captureWindow.center()
  captureWindow.show()
  captureWindow.focus()
}

function loadSourceIconAsync(base: CaptureContext): void {
  const sessionId = pendingContext?.sessionId
  void enrichCaptureContext(base).then((enriched) => {
    if (pendingContext?.sessionId !== sessionId) {
      return
    }
    pendingContext = { ...enriched, sessionId }
    sendContextToOverlay(pendingContext)
  })
}

function mergePermissionHints(...hints: Array<string | undefined>): string | undefined {
  const merged = hints.map((hint) => hint?.trim()).filter(Boolean).join(' ')
  return merged || undefined
}

export function openCaptureOverlay(): void {
  const generation = ++openGeneration
  void (async () => {
    const backdropImage = await captureScreenBackdrop()
    if (generation !== openGeneration) {
      return
    }
    const base = resolveCaptureContext()
    const backdropHint = backdropImage ? undefined : screenCapturePermissionHint()

    pendingContext = {
      ...base,
      sessionId: randomUUID(),
      iconLabel: iconLabel(base),
      permissionHint: mergePermissionHints(base.permissionHint, backdropHint)
    }

    beginCaptureSession()
    warmCaptureWindow()
    await openBackdrop(backdropImage)
    if (generation !== openGeneration) {
      closeBackdrop()
      endCaptureSession(pendingContext.appName)
      return
    }
    await revealCaptureOverlay()
    loadSourceIconAsync(base)
  })().catch((error: unknown) => {
    console.error('[capture] failed to open overlay:', error)
  })
}

export function closeCaptureOverlay(returnToApp?: string): void {
  openGeneration += 1
  const appName = returnToApp ?? pendingContext?.appName ?? ''

  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.hide()
  }
  closeBackdrop()
  endCaptureSession(appName)
}

export function isCaptureOverlayOpen(): boolean {
  return Boolean(captureWindow && !captureWindow.isDestroyed() && captureWindow.isVisible())
}

export function toggleCaptureOverlay(): void {
  if (isCaptureOverlayOpen()) {
    closeCaptureOverlay()
    return
  }
  openCaptureOverlay()
}

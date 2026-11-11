import { app, desktopCapturer, nativeImage, screen, systemPreferences } from 'electron'
import { execFileSync } from 'child_process'
import { readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

function screenCaptureAppName(): string {
  return app.isPackaged ? 'Up to Speed' : 'Electron'
}

/** Hint shown in the capture overlay when screen blur is unavailable. */
export function screenCapturePermissionHint(): string | undefined {
  if (process.platform !== 'darwin') {
    return undefined
  }

  const status = systemPreferences.getMediaAccessStatus('screen')
  if (status === 'granted') {
    return undefined
  }

  return `For a blurred backdrop, turn on Screen Recording for ${screenCaptureAppName()} in System Settings → Privacy & Security, then quit and restart the app.`
}

async function captureViaDesktopCapturer(): Promise<string | null> {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const scale = display.scaleFactor

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.bounds.width * scale),
      height: Math.round(display.bounds.height * scale)
    }
  })

  if (sources.length === 0) {
    return null
  }

  const match =
    sources.find((source) => source.display_id === String(display.id)) ??
    sources.find((source) => source.id.includes(String(display.id))) ??
    sources[0]

  if (!match || match.thumbnail.isEmpty()) {
    return null
  }

  return match.thumbnail.toDataURL()
}

function captureViaScreencapture(): string | null {
  if (process.platform !== 'darwin') {
    return null
  }

  const outputPath = join(tmpdir(), `u2s-backdrop-${Date.now()}.png`)

  try {
    execFileSync('screencapture', ['-x', '-C', outputPath], { timeout: 3000 })
    const buffer = readFileSync(outputPath)
    const image = nativeImage.createFromBuffer(buffer)
    if (image.isEmpty()) {
      return null
    }
    return image.toDataURL()
  } catch {
    return null
  } finally {
    try {
      unlinkSync(outputPath)
    } catch {
      // temp file may not exist
    }
  }
}

/** Grab pixels from the display under the cursor for a Monocle-style blurred backdrop. */
export async function captureScreenBackdrop(): Promise<string | null> {
  try {
    const fromDesktop = await captureViaDesktopCapturer()
    if (fromDesktop) {
      return fromDesktop
    }
  } catch (error) {
    console.warn(
      '[backdrop] desktopCapturer unavailable:',
      error instanceof Error ? error.message : error
    )
  }

  return captureViaScreencapture()
}

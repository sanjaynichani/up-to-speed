import { app, nativeImage, net } from 'electron'
import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { CaptureContext } from '@shared/types'

function iconsDirectory(): string {
  const directory = join(app.getPath('userData'), 'icons')
  mkdirSync(directory, { recursive: true })
  return directory
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname || null
  } catch {
    return null
  }
}

export function iconLabel(context: CaptureContext): string {
  const hostname = context.url ? hostnameFromUrl(context.url) : null
  if (hostname) {
    return hostname.charAt(0).toUpperCase()
  }

  const appName = context.appName.trim()
  if (appName) {
    return appName.charAt(0).toUpperCase()
  }

  return '?'
}

function isValidIcon(image: Electron.NativeImage): boolean {
  if (image.isEmpty()) {
    return false
  }
  const size = image.getSize()
  return size.width >= 8 && size.height >= 8
}

function appBundlePath(appName: string): string | null {
  if (!appName.trim() || process.platform !== 'darwin') {
    return null
  }

  try {
    const escaped = appName.replace(/"/g, '\\"')
    const script = `tell application "System Events" to get POSIX path of (file of (first application process whose name is "${escaped}") as alias)`
    const path = execFileSync('osascript', ['-e', script], { encoding: 'utf-8' }).trim()
    return path || null
  } catch {
    try {
      const result = execFileSync(
        'mdfind',
        [`kMDItemDisplayName == '${appName.replace(/'/g, "'\\''")}'c && kMDItemContentType == 'com.apple.application-bundle'`],
        { encoding: 'utf-8' }
      ).trim()
      return result.split('\n').find(Boolean) ?? null
    } catch {
      return null
    }
  }
}

async function fetchIconBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await net.fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!response.ok) {
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer.length > 0 ? buffer : null
  } catch {
    return null
  }
}

async function faviconDataUrl(pageUrl: string): Promise<string | null> {
  const hostname = hostnameFromUrl(pageUrl)
  if (!hostname) {
    return null
  }

  const cacheKey = createHash('sha1').update(hostname).digest('hex')
  const cachePath = join(iconsDirectory(), `${cacheKey}.png`)

  if (existsSync(cachePath)) {
    const cached = nativeImage.createFromPath(cachePath)
    if (isValidIcon(cached)) {
      return cached.toDataURL()
    }
  }

  const sources = [
    `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    `https://${hostname}/favicon.ico`
  ]

  for (const source of sources) {
    const buffer = await fetchIconBuffer(source)
    if (!buffer) {
      continue
    }

    const image = nativeImage.createFromBuffer(buffer)
    if (!isValidIcon(image)) {
      continue
    }

    writeFileSync(cachePath, image.toPNG())
    return image.toDataURL()
  }

  return null
}

async function appIconDataUrl(appName: string): Promise<string | null> {
  const bundlePath = appBundlePath(appName)
  if (!bundlePath || !existsSync(bundlePath)) {
    return null
  }

  try {
    const image = await app.getFileIcon(bundlePath, { size: 'small' })
    return isValidIcon(image) ? image.toDataURL() : null
  } catch {
    return null
  }
}

export async function resolveSourceIcon(context: CaptureContext): Promise<string | null> {
  if (context.url.trim()) {
    const favicon = await faviconDataUrl(context.url.trim())
    if (favicon) {
      return favicon
    }
  }

  if (context.appName.trim()) {
    return appIconDataUrl(context.appName.trim())
  }

  return null
}

export async function enrichCaptureContext(context: CaptureContext): Promise<CaptureContext> {
  const iconDataUrl = (await resolveSourceIcon(context)) ?? undefined
  return {
    ...context,
    iconLabel: iconLabel(context),
    ...(iconDataUrl ? { iconDataUrl } : {})
  }
}

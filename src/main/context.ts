import { execFileSync } from 'child_process'
import type { CaptureContext } from '@shared/types'

const emptyContext: CaptureContext = {
  appName: '',
  windowTitle: '',
  url: ''
}

const OWN_APP_NAMES = new Set(['electron', 'up to speed', 'up-to-speed'])

const CHROMIUM_BROWSERS = new Set([
  'Google Chrome',
  'Arc',
  'Dia',
  'Brave Browser',
  'Microsoft Edge',
  'Chromium'
])

const BROWSER_APPS = new Set([...CHROMIUM_BROWSERS, 'Safari', 'Firefox'])

/** Returns tab URL and title as `url|||title`. */
const BROWSER_TAB_SCRIPTS: Record<string, string> = {
  Safari: `
    tell application "Safari"
      if (count of windows) > 0 then
        set tabUrl to URL of current tab of front window
        set tabTitle to name of current tab of front window
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `,
  'Google Chrome': `
    tell application "Google Chrome"
      if (count of windows) > 0 then
        set tabUrl to URL of active tab of front window
        set tabTitle to title of active tab of front window
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `,
  Arc: `
    tell application "Arc"
      if (count of windows) > 0 then
        set tabUrl to URL of active tab of front window
        set tabTitle to title of active tab of front window
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `,
  Dia: `
    tell application "Dia"
      if (count of windows) > 0 then
        set w to front window
        set t to active tab of w
        set tabUrl to URL of t
        set tabTitle to name of t
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `,
  'Brave Browser': `
    tell application "Brave Browser"
      if (count of windows) > 0 then
        set tabUrl to URL of active tab of front window
        set tabTitle to title of active tab of front window
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `,
  'Microsoft Edge': `
    tell application "Microsoft Edge"
      if (count of windows) > 0 then
        set tabUrl to URL of active tab of front window
        set tabTitle to title of active tab of front window
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `,
  Chromium: `
    tell application "Chromium"
      if (count of windows) > 0 then
        set tabUrl to URL of active tab of front window
        set tabTitle to title of active tab of front window
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `
}

const FRONTMOST_SCRIPT = `
tell application "System Events"
  set frontApp to name of first application process whose frontmost is true
end tell

set windowTitle to ""
try
  tell application "System Events"
    tell process frontApp
      set windowTitle to name of front window
    end tell
  end tell
end try

return frontApp & "|||" & windowTitle
`

export function isOwnApp(appName: string): boolean {
  return OWN_APP_NAMES.has(appName.trim().toLowerCase())
}

function isBrowser(appName: string): boolean {
  return BROWSER_APPS.has(appName) || CHROMIUM_BROWSERS.has(appName)
}

function readChromiumTabViaJavascript(appName: string): { url: string; title: string; ok: boolean } {
  const escaped = appName.replace(/"/g, '\\"')
  const script = `
    tell application "${escaped}"
      if (count of windows) > 0 then
        set tabUrl to execute active tab of front window javascript "document.location.href"
        set tabTitle to execute active tab of front window javascript "document.title"
        return tabUrl & "|||" & tabTitle
      end if
    end tell
  `

  const result = runAppleScript(script.trim())
  if (!result.ok || !result.output) {
    return { url: '', title: '', ok: false }
  }

  const tab = parseTabOutput(result.output)
  return { ...tab, ok: Boolean(tab.url.startsWith('http')) }
}

function runAppleScript(script: string): { output: string; ok: boolean } {
  try {
    const output = execFileSync('osascript', ['-e', script], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    return { output, ok: true }
  } catch {
    return { output: '', ok: false }
  }
}

function readDiaUrlViaClipboard(): string {
  const saved = runAppleScript('return the clipboard as text')
  const copied = runAppleScript(`
    tell application "Dia" to activate
    delay 0.15
    tell application "System Events"
      tell process "Dia"
        keystroke "c" using {command down, shift down}
      end tell
    end tell
    delay 0.2
    return the clipboard as text
  `)

  if (saved.ok && saved.output) {
    runAppleScript(`set the clipboard to ${applescriptString(saved.output)}`)
  }

  const url = copied.output.trim()
  return url.startsWith('http') ? url : ''
}

function applescriptString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function parseFrontmostOutput(stdout: string): CaptureContext {
  const [appName = '', windowTitle = ''] = stdout.split('|||')
  return {
    appName: appName.trim(),
    windowTitle: windowTitle.trim(),
    url: ''
  }
}

function parseTabOutput(stdout: string): { url: string; title: string } {
  const [url = '', title = ''] = stdout.split('|||')
  return { url: url.trim(), title: title.trim() }
}

export function readFrontmostContext(): CaptureContext {
  if (process.platform !== 'darwin') {
    return emptyContext
  }

  return parseFrontmostOutput(runAppleScript(FRONTMOST_SCRIPT).output)
}

function readBrowserTab(appName: string): { url: string; title: string; ok: boolean } {
  const script = BROWSER_TAB_SCRIPTS[appName]
  if (script) {
    const result = runAppleScript(script.trim())
    if (result.ok && result.output) {
      const tab = parseTabOutput(result.output)
      if (tab.url || tab.title) {
        return { ...tab, ok: true }
      }
    }
  }

  if (CHROMIUM_BROWSERS.has(appName)) {
    return readChromiumTabViaJavascript(appName)
  }

  return { url: '', title: '', ok: false }
}

function permissionHint(appName: string): string {
  return `To auto-fill URLs from ${appName}, allow Up to Speed to control ${appName} in System Settings → Privacy & Security → Automation.`
}

export function readContextForApp(context: CaptureContext): CaptureContext {
  if (!context.appName) {
    return emptyContext
  }

  let url = context.url
  let windowTitle = context.windowTitle
  let permissionHintText: string | undefined

  if (isBrowser(context.appName)) {
    let tab = readBrowserTab(context.appName)

    if (!tab.url && context.appName === 'Dia') {
      const clipboardUrl = readDiaUrlViaClipboard()
      if (clipboardUrl) {
        tab = { url: clipboardUrl, title: tab.title, ok: true }
      }
    }

    if (tab.url) {
      url = tab.url
    }
    if (tab.title && !windowTitle) {
      windowTitle = tab.title
    }
    if (!tab.url) {
      permissionHintText = permissionHint(context.appName)
    }
  }

  return {
    appName: context.appName,
    windowTitle,
    url,
    permissionHint: permissionHintText
  }
}

export function suggestTitle(context: CaptureContext): string {
  if (context.windowTitle) {
    return context.windowTitle.slice(0, 120)
  }
  if (context.url) {
    try {
      const hostname = new URL(context.url).hostname.replace(/^www\./, '')
      if (hostname) {
        return hostname
      }
    } catch {
      // ignore invalid URLs
    }
  }
  if (context.appName) {
    return `Capture from ${context.appName}`
  }
  return ''
}

export function suggestCategory(context: CaptureContext): 'link' | 'doc' | 'context' | 'other' {
  if (context.url) {
    return 'link'
  }
  if (/notion|docs\.google|figma|linear|jira|confluence|linkedin/i.test(context.windowTitle)) {
    return 'link'
  }
  if (/notion|docs\.google|figma|linear|jira|confluence/i.test(context.windowTitle)) {
    return 'doc'
  }
  return 'context'
}

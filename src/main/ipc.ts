import { clipboard, dialog, ipcMain } from 'electron'
import { writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import type { AppState, CaptureInput, CreateStackInput, StackMeta, WorkObjectUpdate } from '@shared/types'
import { broadcastState } from './broadcast'
import {
  applyWorkObjectUpdate,
  assertCaptureInput,
  buildCapture,
  buildWorkObjectFromCaptureInput,
  captureFromWorkObject
} from './builders'
import { moveCaptureInList } from './capture-order'
import { closeCaptureOverlay, getPendingCaptureContext, openCaptureOverlay } from './capture-window'
import { isShortcutRegistered } from './shortcuts'
import { resolveSourceIcon } from './source-icon'
import { playSaveConfirmation } from './save-sound'
import { getStorePath, loadState, saveState } from './storage'

function now(): string {
  return new Date().toISOString()
}

function requireCanvas(state: AppState, canvasId: string) {
  const canvas = state.canvases.find((item) => item.id === canvasId)
  if (!canvas) {
    throw new Error('Stack not found.')
  }
  return canvas
}

function persist(state: AppState): AppState {
  if (!Array.isArray(state.workObjects)) {
    state.workObjects = []
  }
  saveState(state)
  broadcastState(state)
  return state
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      }
    )
  })
}

async function enrichCaptureInput(input: CaptureInput): Promise<CaptureInput> {
  if (input.iconUrl?.trim() || !input.url.trim()) {
    return input
  }

  // A favicon lookup tries several hosts. Saving has to finish even when they don't.
  const iconUrl = await withTimeout(
    resolveSourceIcon({
      appName: input.sourceApp?.trim() ?? '',
      windowTitle: input.windowTitle?.trim() ?? '',
      url: input.url.trim()
    }),
    700
  )

  return iconUrl ? { ...input, iconUrl } : input
}

function parseCreateInput(input: CreateStackInput | string): CreateStackInput {
  if (typeof input === 'string') {
    return { name: input }
  }
  return input
}

export function registerIpc(): void {
  ipcMain.handle('store:get', () => loadState())
  ipcMain.handle('store:path', () => getStorePath())
  ipcMain.handle('capture:get-context', () => getPendingCaptureContext())
  ipcMain.handle('shortcut:status', () => isShortcutRegistered())

  ipcMain.handle('capture:open', () => {
    openCaptureOverlay()
  })

  ipcMain.handle('capture:close', () => {
    closeCaptureOverlay()
  })

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error('Nothing to copy.')
    }
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('canvas:create', (_event, input: CreateStackInput | string) => {
    const payload = parseCreateInput(input)
    const state = loadState()
    const canvas = {
      id: randomUUID(),
      name: payload.name.trim() || 'Untitled stack',
      createdAt: now(),
      updatedAt: now(),
      purpose: payload.purpose?.trim() ?? '',
      recipient: payload.recipient?.trim() ?? '',
      captures: []
    }

    state.canvases.unshift(canvas)
    state.activeCanvasId = canvas.id
    return persist(state)
  })

  ipcMain.handle('canvas:rename', (_event, id: string, name: string) => {
    const state = loadState()
    const canvas = requireCanvas(state, id)
    canvas.name = name.trim() || canvas.name
    canvas.updatedAt = now()
    return persist(state)
  })

  ipcMain.handle('canvas:update-meta', (_event, id: string, meta: StackMeta) => {
    const state = loadState()
    const canvas = requireCanvas(state, id)
    canvas.purpose = meta.purpose.trim()
    canvas.recipient = meta.recipient.trim()
    canvas.updatedAt = now()
    return persist(state)
  })

  ipcMain.handle('canvas:delete', (_event, id: string) => {
    const state = loadState()
    state.canvases = state.canvases.filter((canvas) => canvas.id !== id)
    if (state.activeCanvasId === id) {
      state.activeCanvasId = state.canvases[0]?.id ?? null
    }
    return persist(state)
  })

  ipcMain.handle('canvas:set-active', (_event, id: string) => {
    const state = loadState()
    requireCanvas(state, id)
    state.activeCanvasId = id
    return persist(state)
  })

  ipcMain.handle('capture:add', async (_event, canvasId: string, input: CaptureInput) => {
    assertCaptureInput(input)
    const state = loadState()
    const canvas = requireCanvas(state, canvasId)
    canvas.captures.push(buildCapture(await enrichCaptureInput(input)))
    canvas.updatedAt = now()
    return persist(state)
  })

  ipcMain.handle('capture:quick-add', async (_event, canvasId: string, input: CaptureInput) => {
    assertCaptureInput(input)
    const state = loadState()
    const canvas = requireCanvas(state, canvasId)
    canvas.captures.push(buildCapture(await enrichCaptureInput(input)))
    canvas.updatedAt = now()
    const result = persist(state)
    playSaveConfirmation()
    closeCaptureOverlay()
    return result
  })

  ipcMain.handle('object:inbox-add', async (_event, input: CaptureInput) => {
    assertCaptureInput(input)
    const state = loadState()
    state.workObjects.unshift(buildWorkObjectFromCaptureInput(await enrichCaptureInput(input), 'inbox'))
    const result = persist(state)
    playSaveConfirmation()
    closeCaptureOverlay()
    return result
  })

  ipcMain.handle('object:today-add', async (_event, input: CaptureInput) => {
    assertCaptureInput(input)
    const state = loadState()
    state.workObjects.unshift(buildWorkObjectFromCaptureInput(await enrichCaptureInput(input), 'today'))
    const result = persist(state)
    playSaveConfirmation()
    closeCaptureOverlay()
    return result
  })

  ipcMain.handle('object:place-on-stack', (_event, objectId: string, canvasId: string) => {
    const state = loadState()
    const objectIndex = state.workObjects.findIndex((item) => item.id === objectId)
    if (objectIndex === -1) {
      throw new Error('Object not found.')
    }

    const object = state.workObjects[objectIndex]
    const canvas = requireCanvas(state, canvasId)
    canvas.captures.push(captureFromWorkObject(object))
    canvas.updatedAt = now()
    state.workObjects.splice(objectIndex, 1)
    state.activeCanvasId = canvasId
    return persist(state)
  })

  ipcMain.handle('object:update', (_event, id: string, input: WorkObjectUpdate) => {
    const state = loadState()
    const object = state.workObjects.find((item) => item.id === id)
    if (!object) {
      throw new Error('Object not found.')
    }

    applyWorkObjectUpdate(object, input, now())
    return persist(state)
  })

  ipcMain.handle('object:set-status', (_event, id: string, status: 'inbox' | 'today') => {
    const state = loadState()
    const object = state.workObjects.find((item) => item.id === id)
    if (!object) {
      throw new Error('Object not found.')
    }
    if (status !== 'inbox' && status !== 'today') {
      throw new Error('Unsupported status.')
    }

    object.status = status
    object.updatedAt = now()
    return persist(state)
  })

  ipcMain.handle('object:delete', (_event, id: string) => {
    const state = loadState()
    state.workObjects = state.workObjects.filter((item) => item.id !== id)
    return persist(state)
  })

  ipcMain.handle('capture:update', (_event, canvasId: string, captureId: string, input: CaptureInput) => {
    const state = loadState()
    const canvas = requireCanvas(state, canvasId)
    const capture = canvas.captures.find((item) => item.id === captureId)
    if (!capture) {
      throw new Error('Capture not found.')
    }

    const note = input.note?.trim() ?? ''
    if (!note) {
      throw new Error('Add a takeaway before saving.')
    }

    capture.title = input.title.trim() || capture.title
    capture.url = input.url.trim()
    capture.note = note
    canvas.updatedAt = now()
    return persist(state)
  })

  ipcMain.handle('capture:delete', (_event, canvasId: string, captureId: string) => {
    const state = loadState()
    const canvas = requireCanvas(state, canvasId)
    canvas.captures = canvas.captures.filter((capture) => capture.id !== captureId)
    canvas.updatedAt = now()
    return persist(state)
  })

  ipcMain.handle(
    'capture:move',
    (_event, canvasId: string, captureId: string, direction: 'up' | 'down') => {
      const state = loadState()
      const canvas = requireCanvas(state, canvasId)
      moveCaptureInList(canvas.captures, captureId, direction)
      canvas.updatedAt = now()
      return persist(state)
    }
  )

  ipcMain.handle('markdown:save', async (_event, markdown: string, suggestedName: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Share stack as Markdown',
      defaultPath: `${suggestedName.replace(/[^\w\s-]+/g, '').trim() || 'brief'}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (result.canceled || !result.filePath) {
      return false
    }

    writeFileSync(result.filePath, markdown, 'utf-8')
    return true
  })
}

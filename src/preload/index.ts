import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AppAPI,
  AppState,
  CaptureContext,
  CaptureInput,
  CreateStackInput,
  ThemeMode,
  WorkObjectUpdate
} from '@shared/types'

const api: AppAPI = {
  getState: () => ipcRenderer.invoke('store:get'),
  getStorePath: () => ipcRenderer.invoke('store:path'),
  createCanvas: (input: CreateStackInput | string) => ipcRenderer.invoke('canvas:create', input),
  renameCanvas: (id, name) => ipcRenderer.invoke('canvas:rename', id, name),
  updateCanvasMeta: (id, meta) => ipcRenderer.invoke('canvas:update-meta', id, meta),
  deleteCanvas: (id) => ipcRenderer.invoke('canvas:delete', id),
  setActiveCanvas: (id) => ipcRenderer.invoke('canvas:set-active', id),
  addCapture: (canvasId, input: CaptureInput) => ipcRenderer.invoke('capture:add', canvasId, input),
  updateCapture: (canvasId, captureId, input) =>
    ipcRenderer.invoke('capture:update', canvasId, captureId, input),
  deleteCapture: (canvasId, captureId) => ipcRenderer.invoke('capture:delete', canvasId, captureId),
  moveCapture: (canvasId, captureId, direction) =>
    ipcRenderer.invoke('capture:move', canvasId, captureId, direction),
  saveMarkdown: (markdown, suggestedName) => ipcRenderer.invoke('markdown:save', markdown, suggestedName),
  copyText: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  openCaptureOverlay: () => ipcRenderer.invoke('capture:open'),
  shortcutReady: () => ipcRenderer.invoke('shortcut:status'),
  getCaptureContext: () => ipcRenderer.invoke('capture:get-context'),
  quickCapture: (canvasId, input) => ipcRenderer.invoke('capture:quick-add', canvasId, input),
  quickCaptureInbox: (input: CaptureInput) => ipcRenderer.invoke('object:inbox-add', input),
  quickCaptureToday: (input: CaptureInput) => ipcRenderer.invoke('object:today-add', input),
  updateWorkObject: (id, input: WorkObjectUpdate) => ipcRenderer.invoke('object:update', id, input),
  setWorkObjectStatus: (id, status) => ipcRenderer.invoke('object:set-status', id, status),
  placeWorkObjectOnStack: (objectId, stackId) =>
    ipcRenderer.invoke('object:place-on-stack', objectId, stackId),
  deleteWorkObject: (id) => ipcRenderer.invoke('object:delete', id),
  closeCaptureOverlay: () => {
    void ipcRenderer.invoke('capture:close')
  },
  onBackdropImage: (callback) => {
    const listener = (_event: IpcRendererEvent, dataUrl: string): void => {
      callback(dataUrl)
    }
    ipcRenderer.on('backdrop:image', listener)
    return () => ipcRenderer.removeListener('backdrop:image', listener)
  },
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeUpdated: (callback) => {
    const listener = (_event: IpcRendererEvent, theme: ThemeMode): void => {
      callback(theme)
    }
    ipcRenderer.on('theme:updated', listener)
    return () => ipcRenderer.removeListener('theme:updated', listener)
  },
  onStateUpdated: (callback) => {
    const listener = (_event: IpcRendererEvent, state: AppState): void => {
      callback(state)
    }
    ipcRenderer.on('state:updated', listener)
    return () => ipcRenderer.removeListener('state:updated', listener)
  },
  onCaptureContext: (callback) => {
    const listener = (_event: IpcRendererEvent, context: CaptureContext): void => {
      callback(context)
    }
    ipcRenderer.on('capture:context', listener)
    return () => ipcRenderer.removeListener('capture:context', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

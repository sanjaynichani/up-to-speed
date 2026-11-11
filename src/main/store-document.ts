import { existsSync, renameSync } from 'fs'
import type { AppState, Canvas, Capture, WorkObject } from '@shared/types'
import {
  normalizeCapture,
  normalizeWorkObject,
  readPurpose,
  readRecipient,
  SCHEMA_VERSION
} from './migrate'

export interface StoreDocument {
  state: AppState
  migrated: boolean
  unreadable: boolean
}

function emptyState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    canvases: [],
    activeCanvasId: null,
    workObjects: []
  }
}

function normalizeCanvas(raw: Partial<Canvas> & Record<string, unknown>): Canvas {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : 'Untitled stack',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    purpose: readPurpose(raw),
    recipient: readRecipient(raw),
    captures: Array.isArray(raw.captures)
      ? raw.captures.map((capture) =>
          normalizeCapture(capture as Partial<Capture> & Record<string, unknown>)
        )
      : []
  }
}

function normalizeState(raw: Partial<AppState>): AppState {
  const canvases = Array.isArray(raw.canvases)
    ? raw.canvases.map((canvas) => normalizeCanvas(canvas as Partial<Canvas> & Record<string, unknown>))
    : []
  const workObjects = Array.isArray(raw.workObjects)
    ? raw.workObjects.map((object) =>
        normalizeWorkObject(object as Partial<WorkObject> & Record<string, unknown>)
      )
    : []

  return {
    schemaVersion: SCHEMA_VERSION,
    canvases,
    activeCanvasId:
      typeof raw.activeCanvasId === 'string' ? raw.activeCanvasId : (canvases[0]?.id ?? null),
    workObjects
  }
}

/**
 * Reads one store file. Invalid JSON, or a file with no canvas list, is
 * unreadable. The caller renames that file before saving so the next write
 * cannot replace the only copy.
 */
export function readStoreDocument(raw: string): StoreDocument {
  try {
    const parsed = JSON.parse(raw) as Partial<AppState> | null
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.canvases)) {
      return { state: emptyState(), migrated: false, unreadable: true }
    }

    const incomingVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1
    return {
      state: normalizeState(parsed),
      migrated: incomingVersion < SCHEMA_VERSION,
      unreadable: false
    }
  } catch {
    return { state: emptyState(), migrated: false, unreadable: true }
  }
}

/** Moves a bad store aside. Returns the new path, or null when the file is already gone. */
export function moveUnreadableStore(filePath: string, now = Date.now()): string | null {
  if (!existsSync(filePath)) {
    return null
  }

  const dest = `${filePath}.unreadable-${now}`
  renameSync(filePath, dest)
  return dest
}

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppState } from '@shared/types'
import { backupStoreFile, SCHEMA_VERSION } from './migrate'
import { moveUnreadableStore, readStoreDocument } from './store-document'

const emptyState: AppState = {
  schemaVersion: SCHEMA_VERSION,
  canvases: [],
  activeCanvasId: null,
  workObjects: []
}

export function getStorePath(): string {
  return join(app.getPath('userData'), 'up-to-speed.json')
}

export function loadState(): AppState {
  const filePath = getStorePath()

  if (!existsSync(filePath)) {
    return emptyState
  }

  const document = readStoreDocument(readFileSync(filePath, 'utf-8'))
  if (document.unreadable) {
    moveUnreadableStore(filePath)
    return emptyState
  }

  if (document.migrated) {
    backupStoreFile(filePath, SCHEMA_VERSION)
    saveState(document.state)
  }

  return document.state
}

export function saveState(state: AppState): void {
  const filePath = getStorePath()
  const directory = app.getPath('userData')
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    filePath,
    JSON.stringify(
      {
        ...state,
        schemaVersion: SCHEMA_VERSION
      },
      null,
      2
    ),
    'utf-8'
  )
}

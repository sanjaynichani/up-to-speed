import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '@shared/types'
import { moveUnreadableStore, readStoreDocument } from '../src/main/store-document'

describe('store documents', () => {
  it('reads a current store without marking it for migration', () => {
    const document = readStoreDocument(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        canvases: [
          {
            id: 'stack-1',
            name: 'Q3 brief',
            purpose: 'Reply today',
            recipient: 'Avery',
            captures: [],
            createdAt: '2026-08-21T15:00:00.000Z',
            updatedAt: '2026-08-21T15:00:00.000Z'
          }
        ],
        activeCanvasId: 'stack-1',
        workObjects: []
      })
    )

    expect(document.unreadable).toBe(false)
    expect(document.migrated).toBe(false)
    expect(document.state.canvases[0]?.name).toBe('Q3 brief')
    expect(document.state.workObjects).toEqual([])
  })

  it('marks an older schema for a one-time migration', () => {
    const document = readStoreDocument(
      JSON.stringify({
        schemaVersion: 4,
        canvases: [{ id: 'stack-1', name: 'Older', captures: [] }]
      })
    )

    expect(document.unreadable).toBe(false)
    expect(document.migrated).toBe(true)
    expect(document.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(document.state.workObjects).toEqual([])
  })

  it('treats broken JSON and a missing canvas list as unreadable', () => {
    expect(readStoreDocument('{').unreadable).toBe(true)
    expect(readStoreDocument(JSON.stringify({ workObjects: [] })).unreadable).toBe(true)
    expect(readStoreDocument('null').unreadable).toBe(true)
  })

  it('renames an unreadable file instead of leaving it where the next save would replace it', () => {
    const directory = mkdtempSync(join(tmpdir(), 'up-to-speed-store-'))
    const filePath = join(directory, 'up-to-speed.json')
    writeFileSync(filePath, '{ not json')

    const moved = moveUnreadableStore(filePath, 42)

    expect(moved).toBe(`${filePath}.unreadable-42`)
    expect(readFileSync(moved!, 'utf-8')).toBe('{ not json')
    expect(readStoreDocument('{ not json').unreadable).toBe(true)
  })
})

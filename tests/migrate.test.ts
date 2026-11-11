import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '@shared/types'
import {
  normalizeCapture,
  normalizeWorkObject,
  readPurpose,
  readRecipient
} from '../src/main/migrate'

describe('local schema normalization', () => {
  it('is the schema version this copy documents', () => {
    expect(SCHEMA_VERSION).toBe(5)
  })

  it('reads the current purpose and recipient fields, then the older names', () => {
    expect(readPurpose({ purpose: 'Today', outcome: 'Older' })).toBe('Today')
    expect(readPurpose({ outcome: 'Older outcome' })).toBe('Older outcome')
    expect(readPurpose({})).toBe('')
    expect(readRecipient({ recipient: 'Avery', audience: 'Older' })).toBe('Avery')
    expect(readRecipient({ audience: 'Support lead' })).toBe('Support lead')
  })

  it('keeps a capture readable when older fields are missing', () => {
    const capture = normalizeCapture({
      id: 'cap-1',
      url: 'https://example.com',
      createdAt: '2026-08-21T15:00:00.000Z'
    })

    expect(capture.title).toBe('Untitled capture')
    expect(capture.note).toBe('')
    expect(capture.url).toBe('https://example.com')
  })

  it('defaults an unknown work-object type and status to capture and inbox', () => {
    const object = normalizeWorkObject({
      id: 'obj-1',
      type: 'escalation',
      title: '   ',
      status: 'waiting',
      relations: ['stack-1', 4, null],
      createdAt: '2026-08-21T15:00:00.000Z',
      source: {
        appName: '  ',
        windowTitle: 'Inbox',
        url: 'https://example.com/thread'
      }
    })

    expect(object.type).toBe('capture')
    expect(object.status).toBe('inbox')
    expect(object.title).toBe('Untitled capture')
    expect(object.relations).toEqual(['stack-1'])
    expect(object.source).toEqual({
      windowTitle: 'Inbox',
      url: 'https://example.com/thread'
    })
  })
})

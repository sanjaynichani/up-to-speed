import { describe, expect, it } from 'vitest'
import type { Capture } from '@shared/types'
import { moveCaptureInList } from '../src/main/capture-order'
import { formatTimestamp } from '../src/renderer/src/lib/markdown'
import { isSameCaptureSession, suggestTitle } from '../src/shared/suggest-title'

function capture(id: string): Capture {
  return {
    id,
    title: id,
    url: '',
    note: id,
    createdAt: '2026-08-21T15:00:00.000Z'
  }
}

describe('capture flow helpers', () => {
  it('suggests a title from the window, then the site, then the app', () => {
    expect(
      suggestTitle({ appName: 'Safari', windowTitle: '  Pricing  ', url: 'https://example.com' })
    ).toBe('Pricing')
    expect(suggestTitle({ appName: 'Safari', windowTitle: '   ', url: 'https://www.example.com/pricing' })).toBe(
      'example.com'
    )
    expect(suggestTitle({ appName: 'Notes', windowTitle: '', url: 'not a url' })).toBe('Capture from Notes')
    expect(suggestTitle({ appName: ' ', windowTitle: '', url: '' })).toBe('Untitled capture')
  })

  it('treats only the same session id as an icon update', () => {
    expect(isSameCaptureSession(undefined, 'session-1')).toBe(false)
    expect(isSameCaptureSession('session-1', 'session-2')).toBe(false)
    expect(isSameCaptureSession('session-1', 'session-1')).toBe(true)
  })

  it('reorders captures and leaves the ends alone', () => {
    const captures = [capture('a'), capture('b'), capture('c')]
    moveCaptureInList(captures, 'b', 'up')
    expect(captures.map((item) => item.id)).toEqual(['b', 'a', 'c'])
    moveCaptureInList(captures, 'b', 'up')
    expect(captures.map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(() => moveCaptureInList(captures, 'missing', 'down')).toThrow('Capture not found.')
  })

  it('does not throw when a stored timestamp is unreadable', () => {
    expect(formatTimestamp('not-a-date')).toBe('Unknown time')
    expect(formatTimestamp('2026-08-21T15:00:00.000Z')).toContain('2026')
  })
})

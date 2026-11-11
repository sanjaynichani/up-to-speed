import { describe, expect, it } from 'vitest'
import {
  applyWorkObjectUpdate,
  assertCaptureInput,
  buildCapture,
  buildWorkObjectFromCaptureInput,
  captureFromWorkObject
} from '../src/main/builders'
import type { WorkObject } from '@shared/types'

describe('capture and work-object builders', () => {
  it('trims capture fields and defaults a blank title', () => {
    const capture = buildCapture({
      title: '   ',
      url: '  https://example.com/notes  ',
      note: '  bring the open question  ',
      sourceApp: '  Safari  '
    })

    expect(capture.title).toBe('Untitled capture')
    expect(capture.url).toBe('https://example.com/notes')
    expect(capture.note).toBe('bring the open question')
    expect(capture.sourceApp).toBe('Safari')
    expect(capture.id).toEqual(expect.any(String))
  })

  it('builds an inbox or today capture without keeping empty source fields', () => {
    const today = buildWorkObjectFromCaptureInput(
      {
        title: '  Ship notes  ',
        url: '   ',
        note: '  one open question  ',
        sourceApp: '  ',
        windowTitle: ' Notes '
      },
      'today'
    )

    expect(today).toMatchObject({
      type: 'capture',
      title: 'Ship notes',
      blurb: 'one open question',
      status: 'today',
      relations: [],
      source: { windowTitle: 'Notes' }
    })

    const inbox = buildWorkObjectFromCaptureInput({
      title: '',
      url: '',
      note: ''
    })
    expect(inbox.status).toBe('inbox')
    expect(inbox.title).toBe('Untitled capture')
    expect(inbox.source).toEqual({})
  })

  it('copies a work object back into a stack capture', () => {
    const object: WorkObject = {
      id: 'obj-1',
      type: 'capture',
      title: '  Pricing page ',
      blurb: '  Ask about the annual plan. ',
      status: 'today',
      relations: [],
      createdAt: '2026-08-21T15:00:00.000Z',
      updatedAt: '2026-08-21T15:00:00.000Z',
      source: {
        url: ' https://example.com/pricing ',
        appName: ' Safari ',
        iconUrl: ' https://example.com/icon.png '
      }
    }

    const capture = captureFromWorkObject(object)
    expect(capture.id).not.toBe(object.id)
    expect(capture).toMatchObject({
      title: 'Pricing page',
      url: 'https://example.com/pricing',
      note: 'Ask about the annual plan.',
      createdAt: object.createdAt,
      sourceApp: 'Safari',
      iconUrl: 'https://example.com/icon.png'
    })
  })

  it('keeps longer notes when an inbox item is placed on a stack', () => {
    const capture = captureFromWorkObject({
      id: 'obj-2',
      type: 'note',
      title: 'Rollout question',
      blurb: 'Ask who owns the reply.',
      body: 'The longer note should survive the move.',
      status: 'inbox',
      relations: [],
      createdAt: '2026-08-21T15:00:00.000Z',
      updatedAt: '2026-08-21T15:00:00.000Z'
    })

    expect(capture.note).toBe('Ask who owns the reply.\n\nThe longer note should survive the move.')
  })

  it('keeps the source icon when a detail edit does not change the URL', () => {
    const object = buildWorkObjectFromCaptureInput({
      title: 'Pricing page',
      url: 'https://example.com/pricing',
      note: 'Ask about the annual plan.',
      sourceApp: 'Safari',
      iconUrl: 'https://example.com/icon.png'
    })

    applyWorkObjectUpdate(
      object,
      {
        title: 'Pricing page',
        blurb: 'Ask about the annual plan.',
        body: '',
        type: 'capture',
        status: 'today',
        source: {
          appName: 'Safari',
          windowTitle: 'Pricing',
          url: 'https://example.com/pricing'
        }
      },
      '2026-08-21T16:00:00.000Z'
    )

    expect(object.status).toBe('today')
    expect(object.source?.iconUrl).toBe('https://example.com/icon.png')
    expect(object.source?.windowTitle).toBe('Pricing')
  })

  it('drops the source icon when the URL changes', () => {
    const object = buildWorkObjectFromCaptureInput({
      title: 'Pricing page',
      url: 'https://example.com/pricing',
      note: 'Ask about the annual plan.',
      iconUrl: 'https://example.com/icon.png'
    })

    applyWorkObjectUpdate(
      object,
      {
        title: 'Pricing page',
        blurb: 'Ask about the annual plan.',
        body: '',
        type: 'link',
        status: 'inbox',
        source: {
          appName: '',
          windowTitle: '',
          url: 'https://example.com/other'
        }
      },
      '2026-08-21T16:00:00.000Z'
    )

    expect(object.source?.iconUrl).toBeUndefined()
    expect(object.source?.url).toBe('https://example.com/other')
  })

  it('rejects a detail edit that clears both the blurb and the body', () => {
    const object = buildWorkObjectFromCaptureInput({
      title: 'Pricing page',
      url: 'https://example.com/pricing',
      note: 'Ask about the annual plan.'
    })

    expect(() =>
      applyWorkObjectUpdate(
        object,
        {
          title: 'Pricing page',
          blurb: '   ',
          body: '',
          type: 'capture',
          status: 'inbox',
          source: { appName: '', windowTitle: '', url: 'https://example.com/pricing' }
        },
        '2026-08-21T16:00:00.000Z'
      )
    ).toThrow('Add a takeaway before saving.')
    expect(object.blurb).toBe('Ask about the annual plan.')
  })

  it('rejects a capture that has no takeaway', () => {
    expect(() =>
      assertCaptureInput({
        title: 'Pricing page',
        url: '',
        note: '   '
      })
    ).toThrow('Add a takeaway before saving.')
  })
})

import { describe, expect, it } from 'vitest'
import type { Canvas, Capture } from '@shared/types'
import { briefToMarkdown, briefToPlain, countCapturesMissingTakeaway } from '../src/renderer/src/lib/brief'
import { getStackHints } from '../src/renderer/src/lib/stack-hints'

function capture(overrides: Partial<Capture> = {}): Capture {
  return {
    id: 'cap-1',
    title: 'Design review',
    url: '',
    note: 'Ship the open question, not the whole thread.',
    createdAt: '2026-08-21T15:00:00.000Z',
    ...overrides
  }
}

function stack(overrides: Partial<Canvas> = {}): Canvas {
  return {
    id: 'stack-1',
    name: 'Q3 onboarding brief',
    createdAt: '2026-08-21T15:00:00.000Z',
    updatedAt: '2026-08-21T15:04:00.000Z',
    purpose: 'Give the new SE the accounts that need a reply today.',
    recipient: 'Avery Chen',
    captures: [capture()],
    ...overrides
  }
}

describe('brief output', () => {
  it('writes one markdown shape from purpose, recipient, and ordered captures', () => {
    const markdown = briefToMarkdown(
      stack({
        captures: [
          capture({
            id: 'cap-1',
            title: 'Kickoff notes',
            url: 'https://example.com/kickoff',
            note: 'Confirm the rollout owner.',
            section: 'repro',
            category: 'decision',
            importance: 'critical'
          }),
          capture({
            id: 'cap-2',
            title: 'Empty takeaway',
            url: '',
            note: '   '
          })
        ]
      })
    )

    expect(markdown).toBe(
      [
        '## Q3 onboarding brief',
        '',
        '**Purpose:** Give the new SE the accounts that need a reply today.',
        '',
        '**For:** Avery Chen',
        '',
        '### Context',
        '',
        '1. Confirm the rollout owner.',
        '   Source: Kickoff notes · https://example.com/kickoff',
        '',
        '2. Empty takeaway',
        '   Source: Empty takeaway',
        '',
        '### Links',
        '',
        '- [Kickoff notes](https://example.com/kickoff)',
        ''
      ].join('\n')
    )
    expect(markdown).not.toMatch(/repro|impact|escalat/i)
  })

  it('writes the same stack as plain text without markdown syntax', () => {
    const plain = briefToPlain(
      stack({
        captures: [
          capture({
            title: 'Kickoff notes',
            url: 'https://example.com/kickoff',
            note: 'Confirm the rollout owner.'
          })
        ]
      })
    )

    expect(plain).toContain('Purpose: Give the new SE the accounts that need a reply today.')
    expect(plain).toContain('For: Avery Chen')
    expect(plain).toContain('1. Confirm the rollout owner.')
    expect(plain).toContain('- Kickoff notes: https://example.com/kickoff')
    expect(plain).not.toContain('**')
    expect(plain).not.toContain('](')
  })

  it('keeps an empty stack explicit', () => {
    expect(briefToMarkdown(stack({ captures: [], purpose: '', recipient: '' }))).toBe(
      '## Q3 onboarding brief\n\n_No captures yet._\n'
    )
    expect(briefToPlain(stack({ captures: [], purpose: '', recipient: '' }))).toBe(
      'Q3 onboarding brief\n\nNo captures yet.\n'
    )
  })

  it('counts captures that have no takeaway', () => {
    const current = stack({
      captures: [
        capture({ note: 'Has a takeaway' }),
        capture({ id: 'cap-2', note: '  ' }),
        capture({ id: 'cap-3', note: '' })
      ]
    })

    expect(countCapturesMissingTakeaway(current)).toBe(2)
    expect(getStackHints(current).softWarnings).toContain('2 captures missing a takeaway.')
    expect(getStackHints(stack({ purpose: '', captures: [] })).softWarnings).toEqual([
      'No captures yet — Option + Space to add context.',
      'Add a purpose so the Brief knows what you’re making.'
    ])
  })
})

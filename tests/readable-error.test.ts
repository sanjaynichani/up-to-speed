import { describe, expect, it } from 'vitest'
import { readableError } from '@shared/readable-error'

describe('readableError', () => {
  it('unwraps an Electron IPC error and keeps the sentence', () => {
    const error = new Error(
      "Error invoking remote method 'capture:update': Error: Add a takeaway before saving."
    )
    expect(readableError(error, 'Could not update that capture.')).toBe('Add a takeaway before saving.')
  })

  it('uses the fallback when the reason has no message', () => {
    expect(readableError('nope', 'Could not save.')).toBe('Could not save.')
  })
})

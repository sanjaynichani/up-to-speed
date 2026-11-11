import type { Capture } from '@shared/types'

export function moveCaptureInList(captures: Capture[], captureId: string, direction: 'up' | 'down'): void {
  const index = captures.findIndex((capture) => capture.id === captureId)
  if (index === -1) {
    throw new Error('Capture not found.')
  }

  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= captures.length) {
    return
  }

  ;[captures[swapWith], captures[index]] = [captures[index], captures[swapWith]]
}

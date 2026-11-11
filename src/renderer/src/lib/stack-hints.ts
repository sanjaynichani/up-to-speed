import type { Canvas } from '@shared/types'
import { countCapturesMissingTakeaway } from './brief'

export interface StackHints {
  missingTakeaways: number
  missingPurpose: boolean
  empty: boolean
  softWarnings: string[]
}

export function getStackHints(stack: Canvas): StackHints {
  const missingTakeaways = countCapturesMissingTakeaway(stack)
  const missingPurpose = stack.purpose.trim().length === 0
  const empty = stack.captures.length === 0
  const softWarnings: string[] = []

  if (empty) {
    softWarnings.push('No captures yet — Option + Space to add context.')
  }
  if (missingPurpose) {
    softWarnings.push('Add a purpose so the Brief knows what you’re making.')
  }
  if (missingTakeaways > 0) {
    softWarnings.push(
      `${missingTakeaways} capture${missingTakeaways === 1 ? '' : 's'} missing a takeaway.`
    )
  }

  return { missingTakeaways, missingPurpose, empty, softWarnings }
}

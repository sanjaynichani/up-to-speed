import { execFile } from 'child_process'

const SAVE_SOUND_PATH = '/System/Library/Sounds/Pop.aiff'

export function playSaveConfirmation(): void {
  if (process.platform !== 'darwin') {
    return
  }

  execFile('afplay', [SAVE_SOUND_PATH], (error) => {
    if (error) {
      console.warn('[sound] save confirmation failed:', error.message)
    }
  })
}

import type { ThemeMode } from '@shared/types'

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme
}

const image = document.getElementById('backdrop-image') as HTMLImageElement | null

function showBackdropImage(dataUrl: string): void {
  if (!image || !dataUrl) {
    return
  }

  image.onload = () => {
    image.classList.add('ready')
  }
  image.src = dataUrl
}

document.getElementById('backdrop')?.addEventListener('click', () => {
  window.api.closeCaptureOverlay()
})

window.api.onBackdropImage(showBackdropImage)

void window.api.getTheme().then(applyTheme)
window.api.onThemeUpdated(applyTheme)

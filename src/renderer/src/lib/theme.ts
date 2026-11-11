import type { ThemeMode } from '@shared/types'

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function initTheme(): () => void {
  void window.api.getTheme().then(applyTheme)
  return window.api.onThemeUpdated(applyTheme)
}

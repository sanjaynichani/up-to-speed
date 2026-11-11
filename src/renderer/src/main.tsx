import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initTheme } from './lib/theme'
import './styles.css'

function RootApp() {
  useEffect(() => initTheme(), [])

  return <App />
}

const root = createRoot(document.getElementById('root')!)

if (import.meta.env.DEV) {
  root.render(
    <StrictMode>
      <RootApp />
    </StrictMode>
  )
} else {
  root.render(<RootApp />)
}

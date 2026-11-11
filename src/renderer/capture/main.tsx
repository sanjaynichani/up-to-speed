import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import CaptureOverlay from './CaptureOverlay'
import { initTheme } from '../src/lib/theme'
import './capture.css'

function RootCapture() {
  useEffect(() => initTheme(), [])

  return <CaptureOverlay />
}

const root = createRoot(document.getElementById('root')!)

if (import.meta.env.DEV) {
  root.render(
    <StrictMode>
      <RootCapture />
    </StrictMode>
  )
} else {
  root.render(<RootCapture />)
}

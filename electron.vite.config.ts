import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const shared = resolve('src/shared')
const rendererRoot = resolve('src/renderer')

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': shared
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@shared': shared
      }
    }
  },
  renderer: {
    root: rendererRoot,
    build: {
      rollupOptions: {
        input: {
          index: resolve(rendererRoot, 'index.html'),
          capture: resolve(rendererRoot, 'capture.html'),
          backdrop: resolve(rendererRoot, 'backdrop.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': shared
      }
    },
    plugins: [react()]
  }
})

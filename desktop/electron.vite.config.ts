import { resolve } from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['electron'],
        input: { main: resolve(__dirname, 'main.ts') },
        output: { format: 'cjs' }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['electron'],
        input: { preload: resolve(__dirname, 'preload.cjs') },
        output: { format: 'cjs' }
      }
    }
  },
  renderer: {
    root: '.',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': resolve(__dirname, './src') } },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'index.html') }
      }
    }
  }
})

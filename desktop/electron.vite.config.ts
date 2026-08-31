import { resolve } from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['electron'],
        input: { main: resolve(__dirname, 'electron/main.ts') },
        output: { format: 'cjs' }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        external: ['electron'],
        input: {
          index: resolve(__dirname, 'preload/index.ts'),
          mascot: resolve(__dirname, 'preload/mascot.ts')
        },
        output: { format: 'cjs' }
      }
    }
  },
  renderer: {
    root: '.',
    plugins: [react({ compiler: true }), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@customization': resolve(__dirname, '../customization')
      },
      dedupe: ['react', 'react-dom', '@tanstack/react-table', '@tanstack/react-virtual']
    },
    optimizeDeps: {
      include: ['@tanstack/react-table', '@tanstack/react-virtual']
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          mascot: resolve(__dirname, 'mascot.html')
        }
      }
    }
  }
})

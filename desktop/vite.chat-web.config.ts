import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const stamp = process.env.PIERRE_ASSET_STAMP ?? String(Date.now())

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react({ compiler: true }), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@customization': resolve(__dirname, '../customization')
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: resolve(__dirname, '../server/assets/dist'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/chat-web/main.tsx'),
      output: {
        entryFileNames: `js/ai.${stamp}.js`,
        chunkFileNames: `js/[name].${stamp}.js`,
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return `css/style.${stamp}.css`
          return `assets/[name][extname]`
        }
      }
    }
  }
})

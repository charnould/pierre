import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(__dirname),
  base: '/assets/dist/',
  plugins: [react({ compiler: true }), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: resolve(__dirname, '../server/assets/dist'),
    emptyOutDir: false,
    cssCodeSplit: false,
    manifest: true,
    minify: true,
    rollupOptions: {
      input: {
        ai: resolve(__dirname, 'src/chat-web/main.tsx')
      },
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'css/style-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})

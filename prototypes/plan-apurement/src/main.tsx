import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { TooltipProvider } from './ui'

import './global.css'

const root = document.getElementById('root')
if (!root) throw new Error('root manquant')

createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
)

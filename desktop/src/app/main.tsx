import '../globals.css'
import { createRoot } from 'react-dom/client'

import '@/shared/types/window-api'

import { App } from './App'
import { AppErrorBoundary } from './AppErrorBoundary'

const container = document.getElementById('root')!
createRoot(container).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
)

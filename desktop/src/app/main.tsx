import '../globals.css'
import { createRoot } from 'react-dom/client'

import '@/shared/types/window-api'

import { App } from './App'

const container = document.getElementById('root')!
createRoot(container).render(<App />)

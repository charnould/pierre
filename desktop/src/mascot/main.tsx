import '../globals.css'
import { createRoot } from 'react-dom/client'

import '@/shared/types/window-api'

import { MascotApp } from './MascotApp'

const container = document.getElementById('root')!
createRoot(container).render(<MascotApp />)

import './theme.css'
import { createRoot } from 'react-dom/client'

import { ChatWebApp } from './ChatWebApp'

document.documentElement.dataset.chatChrome = 'public'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<ChatWebApp />)
}

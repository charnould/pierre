import { createRoot } from 'react-dom/client'

import { ChatApp } from './ChatApp'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<ChatApp />)
}

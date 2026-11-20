import './intake.css'

import type { IntakePublicBoot } from '@pierre/shared/intakes'
import { createRoot } from 'react-dom/client'

import { IntakeWebApp } from './IntakeWebApp'

function readBoot(): IntakePublicBoot | null {
  const el = document.getElementById('intake-data')
  if (!el?.textContent) return null
  try {
    return JSON.parse(el.textContent) as IntakePublicBoot
  } catch {
    return null
  }
}

const root = document.getElementById('root')
const boot = readBoot()
if (root && boot) {
  createRoot(root).render(<IntakeWebApp boot={boot} />)
}

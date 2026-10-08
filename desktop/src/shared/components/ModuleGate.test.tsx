import { afterEach, describe, expect, test } from 'bun:test'

import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { resetCustomization } from '@/shared/lib/instance-customization'
import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { ModuleGate } from './ModuleGate'

describe('ModuleGate', () => {
  afterEach(() => {
    resetCustomization()
  })

  test('names the missing repayment pieces', async () => {
    loadCustomizationFixture({ repayments: null, repaymentGaps: ['Courrier standard'] })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<ModuleGate entry="repayment">{null}</ModuleGate>)
    })
    expect(host.textContent).toContain('Module non paramétré')
    expect(host.textContent).toContain('Courrier standard')
    await act(async () => root.unmount())
    host.remove()
  })

  test('renders its content when repayment is ready', async () => {
    loadCustomizationFixture()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<ModuleGate entry="repayment">Tableau</ModuleGate>)
    })
    expect(host.textContent).toContain('Tableau')
    expect(host.textContent).not.toContain('Maximum update depth')
    await act(async () => root.unmount())
    host.remove()
  })

  test('renders the closed gate when no gap list is stored', async () => {
    loadCustomizationFixture({ repayments: null })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<ModuleGate entry="repayment">{null}</ModuleGate>)
    })
    expect(host.textContent).toContain('Module non paramétré')
    expect(host.textContent).not.toContain('Maximum update depth')
    await act(async () => root.unmount())
    host.remove()
  })
})

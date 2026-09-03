import { useSyncExternalStore } from 'react'

import { warnRenderer } from '@/shared/lib/renderer-log'

export type CustomizationStatus = 'idle' | 'loading' | 'ready' | 'error'

export type InstanceCustomization = {
  name: string
  tickets: {
    buckets: readonly { id: string; label: string }[]
    actions: { dossier: string[] }
    tags: readonly string[]
    external_application?: unknown
    prompt?: string
  } | null
  repayments: {
    buckets: readonly { id: string; label: string }[]
    actions: { dossier: readonly unknown[]; bulk_operations: readonly unknown[] }
    tags: readonly string[]
    template_groups?: unknown
    create_plan: unknown
    templates: Record<string, string>
    prompt?: string
  } | null
  docxSkillIds: string[]
  about: { prompt: string } | null
  automations: { prompt: string; timezone: string } | null
  chatbot: boolean
}

export type SetupEntry = 'tickets' | 'repayment' | 'about' | 'automations' | 'chatbot'

const listeners = new Set<() => void>()

let status: CustomizationStatus = 'idle'
let data: InstanceCustomization | null = null

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeCustomization(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function customizationStatus(): CustomizationStatus {
  return status
}

export function beginCustomizationLoad() {
  status = 'loading'
  emit()
}

export function loadCustomization(next: InstanceCustomization) {
  data = next
  status = 'ready'
  emit()
}

export function failCustomization() {
  data = null
  status = 'error'
  emit()
}

export function resetCustomization() {
  data = null
  status = 'idle'
  emit()
}

export function ticketsSetup() {
  const tickets = instanceCustomization().tickets
  if (!tickets) throw new Error('tickets not ready')
  return tickets
}

export function repaymentSetup() {
  const repayments = instanceCustomization().repayments
  if (!repayments) throw new Error('repayment not ready')
  return repayments
}
export function instanceCustomization(): InstanceCustomization {
  if (!data) throw new Error('setup not ready')
  return data
}

export function moduleReady(entry: SetupEntry): boolean {
  if (!data) return false
  if (entry === 'tickets') return data.tickets != null
  if (entry === 'repayment') return data.repayments != null
  if (entry === 'about') return data.about != null
  if (entry === 'automations') return data.automations != null
  return data.chatbot
}

export function useCustomizationStatus(): CustomizationStatus {
  return useSyncExternalStore(subscribeCustomization, customizationStatus)
}

export async function hydrateCustomizationFromServer(url: string): Promise<string | null> {
  beginCustomizationLoad()
  try {
    const payload = await window.api?.getSetup?.({ url })
    if (!isCustomizationPayload(payload)) {
      failCustomization()
      return null
    }
    loadCustomization(payload)
    return payload.name
  } catch (error) {
    warnRenderer('hydrateCustomizationFromServer', error)
    failCustomization()
    return null
  }
}

export function isCustomizationPayload(value: unknown): value is InstanceCustomization {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  if (typeof row.name !== 'string' || !row.name.trim()) return false
  if (row.tickets != null && (typeof row.tickets !== 'object' || Array.isArray(row.tickets))) {
    return false
  }
  if (
    row.repayments != null &&
    (typeof row.repayments !== 'object' || Array.isArray(row.repayments))
  ) {
    return false
  }
  if (row.repayments != null) {
    const repayments = row.repayments as Record<string, unknown>
    if (
      repayments.templates == null ||
      typeof repayments.templates !== 'object' ||
      Array.isArray(repayments.templates)
    ) {
      return false
    }
  }
  return Array.isArray(row.docxSkillIds) && typeof row.chatbot === 'boolean'
}

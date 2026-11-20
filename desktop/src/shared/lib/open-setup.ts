import { useSyncExternalStore } from 'react'

import type { SetupEntry } from '@/shared/lib/instance-customization'

export type AdminRequestTarget = SetupEntry | 'knowledge'

let administrator = false
let entry: AdminRequestTarget | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function setSetupAdministrator(value: boolean) {
  if (administrator === value) return
  administrator = value
  emit()
}

export function requestSetup(next: AdminRequestTarget) {
  entry = next
  emit()
}

export function consumeSetupRequest(): AdminRequestTarget | null {
  const current = entry
  entry = null
  return current
}

export function useSetupAdministrator(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => administrator
  )
}

export function useSetupRequest(): AdminRequestTarget | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => entry,
    () => entry
  )
}

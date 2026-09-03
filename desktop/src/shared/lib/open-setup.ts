import { useSyncExternalStore } from 'react'

import type { SetupEntry } from '@/shared/lib/instance-customization'

let administrator = false
let entry: SetupEntry | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function setSetupAdministrator(value: boolean) {
  if (administrator === value) return
  administrator = value
  emit()
}

export function requestSetup(next: SetupEntry) {
  entry = next
  emit()
}

export function consumeSetupRequest(): SetupEntry | null {
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

export function useSetupRequest(): SetupEntry | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => entry
  )
}

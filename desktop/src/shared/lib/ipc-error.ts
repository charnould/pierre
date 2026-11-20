import type { IpcDataResult } from '@/shared/types/ipc'

export function isIpcData<T>(res: IpcDataResult<T> | undefined): res is { data: T } {
  return Boolean(res && 'data' in res && res.data !== undefined && res.data !== null)
}

export function ipcErrorMessage<T>(
  res: IpcDataResult<T> | undefined,
  fallback: string
): string | null {
  if (isIpcData(res)) return null
  const message = res && 'error' in res ? res.error.message.trim() : ''
  return message || fallback
}

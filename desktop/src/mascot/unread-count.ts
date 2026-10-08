export function readMascotUnreadCount(payload: unknown): { count: number; orbit: boolean } | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as { count?: unknown; orbit?: unknown }
  if (typeof record.count !== 'number' || typeof record.orbit !== 'boolean') return null
  return { count: record.count, orbit: record.orbit }
}

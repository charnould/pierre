type ActiveStream = {
  requestId: string
  controller: AbortController
}

export type StreamRegistry = Map<string, ActiveStream>

/**
 * Starts (or replaces) a stream for `requestId` and returns its abort controller.
 */
export function beginStream(registry: StreamRegistry, requestId: string): AbortController {
  const prior = registry.get(requestId)
  if (prior) prior.controller.abort()
  const controller = new AbortController()
  registry.set(requestId, { requestId, controller })
  return controller
}

/**
 * Removes a stream entry when the active controller still matches.
 */
export function endStream(
  registry: StreamRegistry,
  requestId: string,
  controller: AbortController
): void {
  const active = registry.get(requestId)
  if (active?.controller === controller) {
    registry.delete(requestId)
  }
}

/**
 * Aborts and removes a stream by request id.
 */
export function cancelStream(registry: StreamRegistry, requestId: string): void {
  const active = registry.get(requestId)
  if (active) {
    active.controller.abort()
    registry.delete(requestId)
  }
}

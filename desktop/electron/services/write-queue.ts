/**
 * Serializes async work so concurrent callers run one at a time.
 *
 * Used in the main process to prevent read-modify-write races on JSON files.
 * Failures do not break the queue — the next operation still runs.
 */
export function createWriteQueue() {
  let tail: Promise<unknown> = Promise.resolve()

  return {
    /**
     * Enqueues `task` after all prior enqueued tasks have settled.
     *
     * @returns The resolved value of `task`, or propagates its rejection.
     */
    enqueue<T>(task: () => Promise<T> | T): Promise<T> {
      const run = tail.then(task, task)
      tail = run.then(
        () => undefined,
        () => undefined
      )
      return run
    }
  }
}

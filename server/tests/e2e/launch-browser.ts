const DEFAULT_TIMEOUT = 60_000
const POLL_INTERVAL = 25
const initializedViews = new WeakSet<Bun.WebView>()

export const e2eUrl = (path = '/'): string =>
  new URL(path, Bun.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:3000').toString()

export function createE2EView(
  dimensions: { width: number; height: number } = { width: 1080, height: 1024 }
): Bun.WebView {
  return new Bun.WebView({
    backend: { type: 'chrome', url: false },
    dataStore: 'ephemeral',
    width: dimensions.width,
    height: dimensions.height
  })
}

export async function evaluate<T>(view: Bun.WebView, expression: string): Promise<T> {
  return (await view.evaluate(expression)) as T
}

async function waitFor(
  description: string,
  condition: () => Promise<boolean>,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  const deadline = Date.now() + timeout
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      if (await condition()) return
    } catch (error) {
      // A full navigation can replace the execution context between polls.
      lastError = error
    }
    await Bun.sleep(POLL_INTERVAL)
  }

  const cause = lastError instanceof Error ? `: ${lastError.message}` : ''
  throw new Error(`Timed out waiting for ${description}${cause}`)
}

export async function currentUrl(view: Bun.WebView): Promise<string> {
  return evaluate<string>(view, 'window.location.href')
}

export async function navigate(view: Bun.WebView, url: string): Promise<void> {
  if (!initializedViews.has(view)) {
    await view.navigate('about:blank')
    await view.cdp('Network.clearBrowserCookies')
    initializedViews.add(view)
  }
  await view.navigate(url)
}

export async function waitForDom(
  view: Bun.WebView,
  condition: string,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  await waitFor(
    `DOM condition (${condition})`,
    () => evaluate<boolean>(view, `Boolean(${condition})`),
    timeout
  )
}

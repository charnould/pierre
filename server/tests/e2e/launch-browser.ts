import { resolve } from 'node:path'

const DEFAULT_TIMEOUT = 60_000
const POLL_INTERVAL = 25
const initializedViews = new WeakSet<Bun.WebView>()

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

export async function fillInput(view: Bun.WebView, selector: string, value: string): Promise<void> {
  await view.click(selector, { timeout: DEFAULT_TIMEOUT })
  await view.type(value)
}

export async function waitForUrl(
  view: Bun.WebView,
  expected: string | RegExp,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  const source =
    typeof expected === 'string'
      ? `window.location.href === ${JSON.stringify(expected)}`
      : `new RegExp(${JSON.stringify(expected.source)}, ${JSON.stringify(expected.flags)}).test(window.location.href)`

  await waitFor(`URL ${String(expected)}`, () => evaluate<boolean>(view, source), timeout)
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

export async function clickAndWait(
  view: Bun.WebView,
  selector: string,
  expectation: { url: string | RegExp } | { dom: string },
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  const before = await currentUrl(view)
  let didNavigate = false
  const previousOnNavigated = view.onNavigated

  view.onNavigated = (...args) => {
    previousOnNavigated?.(...args)
    didNavigate = true
  }

  const expected = 'url' in expectation ? expectation.url : undefined
  try {
    if ('url' in expectation && typeof expectation.url === 'string' && expectation.url === before) {
      const turboMarker = `__e2eTurbo${Bun.randomUUIDv7().replaceAll('-', '')}`
      await evaluate(
        view,
        `(() => {
          document.addEventListener(
            "turbo:load",
            () => { window[${JSON.stringify(turboMarker)}] = true },
            { once: true }
          )
          return true
        })()`
      )
      await view.click(selector, { timeout })
      await waitFor(
        `navigation or Turbo update to ${expectation.url}`,
        async () => {
          const href = await currentUrl(view)
          if (href !== expectation.url) return false
          if (didNavigate) return true
          return evaluate<boolean>(view, `window[${JSON.stringify(turboMarker)}] === true`)
        },
        timeout
      )
    } else {
      const observed = waitFor(
        'url or DOM change after click',
        async () => {
          if ('dom' in expectation) {
            return evaluate<boolean>(view, `Boolean(${expectation.dom})`)
          }

          const href = await currentUrl(view)
          if (typeof expected === 'string') return href === expected
          if (!expected) return false
          expected.lastIndex = 0
          return expected.test(href)
        },
        timeout
      )
      await view.click(selector, { timeout })
      await observed
    }
  } finally {
    view.onNavigated = previousOnNavigated
  }
}

export async function elementCount(view: Bun.WebView, selector: string): Promise<number> {
  return evaluate<number>(view, `document.querySelectorAll(${JSON.stringify(selector)}).length`)
}

export async function elementHrefs(view: Bun.WebView, selector: string): Promise<string[]> {
  return evaluate<string[]>(
    view,
    `[...document.querySelectorAll(${JSON.stringify(selector)})].map((element) => element.href)`
  )
}

export async function getCookies(view: Bun.WebView): Promise<Array<{ name: string }>> {
  const result = (await view.cdp('Network.getAllCookies')) as {
    cookies: Array<{ name: string }>
  }
  return result.cookies
}

export async function uploadFiles(
  view: Bun.WebView,
  selector: string,
  ...files: string[]
): Promise<void> {
  const absoluteFiles = files.map((file) => resolve(file))
  const { root } = (await view.cdp('DOM.getDocument')) as {
    root: { nodeId: number }
  }
  const { nodeId } = (await view.cdp('DOM.querySelector', {
    nodeId: root.nodeId,
    selector
  })) as { nodeId: number }

  if (!nodeId) throw new Error(`File input not found: ${selector}`)

  await view.cdp('DOM.setFileInputFiles', { files: absoluteFiles, nodeId })
}

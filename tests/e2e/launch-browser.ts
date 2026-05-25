import puppeteer, {
  type Browser,
  type LaunchOptions,
  type Page,
  type WaitForOptions
} from 'puppeteer'

const DEFAULT_LAUNCH: LaunchOptions = {
  headless: 'shell',
  timeout: 60_000
}

export async function launchE2EBrowser(options: LaunchOptions = {}): Promise<Browser> {
  return puppeteer.launch({ ...DEFAULT_LAUNCH, ...options })
}

export async function clickAndWaitNavigation(
  page: Page,
  selector: string,
  options?: { waitUntil?: WaitForOptions['waitUntil']; url?: string | RegExp }
): Promise<void> {
  await page.waitForSelector(selector, { visible: true, timeout: 60_000 })

  if (options?.url) {
    await page.click(selector)
    await page.waitForFunction(
      (expected) => {
        const href = window.location.href
        return typeof expected === 'string' ? href === expected : expected.test(href)
      },
      { timeout: 60_000 },
      options.url
    )
    return
  }

  const navigation = page.waitForNavigation({
    waitUntil: options?.waitUntil ?? 'networkidle2',
    timeout: 60_000
  })
  await page.click(selector)
  await navigation
}

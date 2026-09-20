import { expect, it } from 'bun:test'

import { createE2EView, currentUrl, evaluate, navigate, waitForDom } from './launch-browser'

it('serves the public chatbot on / and embeds ?data= in the boot payload', async () => {
  await using view = createE2EView()

  await navigate(view, 'http://localhost:3000/')
  expect(await currentUrl(view)).toBe('http://localhost:3000/')
  await waitForDom(view, 'document.querySelector("img[src=\\"/branding/system.svg\\"]")')
  expect(await evaluate<string>(view, 'document.body.innerText')).toContain('Bonjour')
  expect(
    await evaluate<string>(view, 'document.getElementById("pierre-data")?.textContent ?? ""')
  ).toContain('"dataParam":""')

  await navigate(view, 'http://localhost:3000/?data=L-42')
  expect(await currentUrl(view)).toBe('http://localhost:3000/?data=L-42')
  await waitForDom(view, 'document.getElementById("pierre-data")')
  const boot = await evaluate<string>(
    view,
    'document.getElementById("pierre-data")?.textContent ?? ""'
  )
  expect(boot).toContain('"dataParam":"L-42"')
  expect(boot).toContain('L-42')
})

import { expect, it } from 'bun:test'

import { createE2EView, currentUrl, e2eUrl, evaluate, navigate, waitForDom } from './launch-browser'

it('serves the public chatbot on / and embeds ?data= in the boot payload', async () => {
  await using view = createE2EView()

  await navigate(view, e2eUrl('/'))
  expect(await currentUrl(view)).toBe(e2eUrl('/'))
  await waitForDom(view, '(document.querySelector("#root")?.childElementCount ?? 0) > 0')
  expect(await evaluate<string>(view, 'document.body.innerText')).toContain('Bonjour')
  const initialBoot = await evaluate<string>(
    view,
    'document.getElementById("pierre-data")?.textContent ?? ""'
  )
  expect(initialBoot).toContain('"dataParam":""')
  expect(initialBoot).toContain('"Question"')

  await navigate(view, e2eUrl('/?data=L-42'))
  expect(await currentUrl(view)).toBe(e2eUrl('/?data=L-42'))
  await waitForDom(view, 'document.getElementById("pierre-data")')
  const boot = await evaluate<string>(
    view,
    'document.getElementById("pierre-data")?.textContent ?? ""'
  )
  expect(boot).toContain('"dataParam":"L-42"')
  expect(boot).toContain('L-42')
})

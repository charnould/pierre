import { expect, it } from 'bun:test'

it('should redirect `http://localhost:3000/c` correctly', async () => {
  const path = 'http://localhost:3000/c/'

  fetch(`${path}`).then((r) => {
    expect(r.url).toMatch(/http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/)
  })

  fetch(`${path}/wrong_uuid`).then((r) => {
    expect(r.url).toMatch(/http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/)
  })

  fetch(`${path}/?config=wrong_config`).then((r) => {
    expect(r.url).toMatch(/http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/)
  })

  fetch(`${path}/?config=wrong_config&context=wrong_context`).then((r) => {
    expect(r.url).toMatch(/http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/)
  })

  fetch(`${path}/?config=pierre-ia.org&context=default`).then((r) => {
    expect(r.url).toMatch(/http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default/)
  })

  fetch(`${path}/?config=pierre-ia.org&context=en_agence`).then((r) => {
    expect(r.url).toMatch(
      /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=en_agence/
    )
  })

  fetch(`${path}/?config=granddijonhabitat.fr&`).then((r) => {
    expect(r.url).toMatch(
      /http:\/\/localhost:3000\/c\/.{36}\?config=granddijonhabitat.fr&context=default/
    )
  })

  fetch(`${path}/?config=granddijonhabitat.fr&context=en_agence`).then((r) => {
    expect(r.url).toMatch(
      /http:\/\/localhost:3000\/c\/.{36}\?config=granddijonhabitat.fr&context=en_agence/
    )
  })
})

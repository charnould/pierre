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

  fetch(`${path}/?config=pierre-ia.org&context=no_rag&data=test`).then((r) => {
    expect(r.url).toMatch(
      /http:\/\/localhost:3000\/a\/login\?redirection=c%2F%3Fconfig%3Dpierre-ia.org%26context%3Dno_rag%26data%3Dtest/
    )
  })

  fetch(`${path}/?data=test`).then((r) => {
    expect(r.url).toMatch(
      /http:\/\/localhost:3000\/c\/.{36}\?config=pierre-ia.org&context=default&data=test/
    )
  })
})

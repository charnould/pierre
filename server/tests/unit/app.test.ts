import { describe, expect, it, spyOn } from 'bun:test'

import { Hono } from 'hono'

import { createApp, handleError } from '../../app'

describe('createApp', () => {
  const app = createApp()

  it('answers the health check without starting background work', async () => {
    const response = await app.request('/up')
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
  })

  it('mounts every protected canonical route behind authentication', async () => {
    for (const [method, path] of [
      ['GET', '/activities'],
      ['GET', '/automations'],
      ['GET', '/bulk'],
      ['GET', '/tickets'],
      ['GET', '/ledger'],
      ['GET', '/repayment?id_locataire=LOC-1'],
      ['GET', '/datastore'],
      ['GET', '/users'],
      ['GET', '/me'],
      ['GET', '/setup'],
      ['GET', '/admin/users'],
      ['GET', '/knowledge'],
      ['POST', '/communications/external'],
      ['GET', '/chat/config'],
      ['DELETE', `/chat/sessions/${Bun.randomUUIDv7()}`],
      ['POST', '/workflows']
    ] as const) {
      const response = await app.request(path, { method })
      expect(response.status, `${method} ${path}`).toBe(401)
      expect(await response.json()).toMatchObject({
        error: { code: 'unauthorized' }
      })
    }
  })

  it('mounts public and capability routes without turning them into 404s', async () => {
    for (const [method, path] of [
      ['GET', '/embed'],
      ['POST', '/chat/responses'],
      ['POST', '/webhooks/rcs'],
      ['POST', '/telemetry'],
      ['POST', '/carl']
    ] as const) {
      const response = await app.request(path, { method })
      expect(response.status, `${method} ${path}`).not.toBe(404)
    }
  })

  it('enforces the shared small JSON body limit', async () => {
    const response = await app.request('/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ host: 'test', event: 'x'.repeat(64 * 1024) })
    })
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: { code: 'body_too_large', message: 'Request body is too large' }
    })
  })

  it('returns the public empty page for an unknown document', async () => {
    const response = await app.request('/wrong_path', {
      headers: { accept: 'text/html' }
    })
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/html')
  })

  it('returns JSON 404 for unknown API routes and removed legacy paths', async () => {
    for (const path of [
      '/communications/unknown',
      '/desktop/activities',
      '/api/admin/knowledge',
      '/api/models/carl',
      '/ai',
      '/webhook/rcs',
      '/rcs',
      '/email/test',
      '/signature'
    ]) {
      const response = await app.request(path, { method: 'POST' })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({
        error: { code: 'not_found', message: 'Not found' }
      })
    }
  })

  it('reports an internal failure as 500 JSON', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    const probe = new Hono()
    probe.onError(handleError)
    probe.get('/activities/boom', () => {
      throw new Error('boom')
    })
    try {
      const response = await probe.request('/activities/boom')
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: { code: 'internal_error', message: 'Internal Server Error' }
      })
      expect(errorSpy).toHaveBeenCalledTimes(1)
    } finally {
      errorSpy.mockRestore()
    }
  })
})

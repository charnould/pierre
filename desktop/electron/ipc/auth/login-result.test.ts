import { describe, expect, it } from 'bun:test'

import {
  authRequestHeaders,
  isPierreAuthCookie,
  loginFailureFromStatus,
  principalFailureFromStatus
} from './login-result'

describe('loginFailureFromStatus', () => {
  it('maps credential, rate-limit, and server failures', () => {
    expect(loginFailureFromStatus(401)).toBe('invalid_credentials')
    expect(loginFailureFromStatus(429)).toBe('rate_limited')
    expect(loginFailureFromStatus(500)).toBe('server_error')
    expect(loginFailureFromStatus(502)).toBe('server_error')
  })
})

describe('principalFailureFromStatus', () => {
  it('maps expired sessions separately from other failures', () => {
    expect(principalFailureFromStatus(401)).toBe('session_expired')
    expect(principalFailureFromStatus(500)).toBe('server_error')
  })
})

describe('authRequestHeaders', () => {
  it('sends the server origin so Better Auth accepts Electron POSTs', () => {
    expect(authRequestHeaders('http://localhost:3000/')).toEqual({
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000'
    })
  })
})

describe('isPierreAuthCookie', () => {
  it('matches Better Auth cookie names only', () => {
    expect(isPierreAuthCookie('pierre.session_token')).toBe(true)
    expect(isPierreAuthCookie('__Secure-pierre.session_token')).toBe(true)
    expect(isPierreAuthCookie('__Host-pierre.session_token')).toBe(true)
    expect(isPierreAuthCookie('other')).toBe(false)
  })
})

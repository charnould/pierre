import { describe, expect, test } from 'bun:test'

import {
  connectionFieldInvalid,
  loginErrorLabel,
  loginFieldErrorsFromCode,
  LOGIN_INVALID_URL_LABEL,
  LOGIN_REQUIRED_LABEL,
  validateLoginFields
} from './login-errors'

describe('validateLoginFields', () => {
  test('flags each empty field', () => {
    expect(validateLoginFields({ url: '', email: '', password: '' })).toEqual({
      url: LOGIN_REQUIRED_LABEL,
      email: LOGIN_REQUIRED_LABEL,
      password: LOGIN_REQUIRED_LABEL
    })
  })

  test('flags an invalid URL without touching filled credentials', () => {
    expect(
      validateLoginFields({
        url: 'not-a-url',
        email: 'a@b.fr',
        password: 'secret'
      })
    ).toEqual({ url: LOGIN_INVALID_URL_LABEL })
  })
})

describe('loginFieldErrorsFromCode', () => {
  test('places credential and rate-limit errors on password', () => {
    expect(loginFieldErrorsFromCode('invalid_credentials')).toEqual({
      password: loginErrorLabel('invalid_credentials')
    })
    expect(loginFieldErrorsFromCode('rate_limited')).toEqual({
      password: loginErrorLabel('rate_limited')
    })
  })

  test('places session, network, and server errors on url', () => {
    expect(loginFieldErrorsFromCode('session_expired')).toEqual({
      url: loginErrorLabel('session_expired')
    })
    expect(loginFieldErrorsFromCode('network_error')).toEqual({
      url: loginErrorLabel('network_error')
    })
    expect(connectionFieldInvalid('url', loginFieldErrorsFromCode('server_error'))).toBe(true)
    expect(connectionFieldInvalid('email', loginFieldErrorsFromCode('server_error'))).toBe(false)
  })
})

describe('loginErrorLabel', () => {
  test('maps login errors to French labels', () => {
    expect(loginErrorLabel('invalid_credentials')).toContain('Email ou mot de passe incorrect')
    expect(loginErrorLabel('rate_limited')).toContain('Trop de tentatives')
    expect(loginErrorLabel('session_expired')).toContain('session a expiré')
    expect(loginErrorLabel('network_error')).toContain('Impossible de joindre')
    expect(loginErrorLabel('invalid_response')).toContain('Impossible de joindre')
    expect(loginErrorLabel('api_unavailable')).toContain('Impossible de joindre')
    expect(loginErrorLabel('some_unknown_code')).toContain('some_unknown_code')
    expect(loginErrorLabel()).toContain('Identifiant ou mot de passe')
  })
})

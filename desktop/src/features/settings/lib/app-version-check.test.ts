import { describe, expect, it } from 'bun:test'

import {
  APP_RELEASES_URL,
  isWindowsPlatform,
  resolveUpdateCheckAction,
  runAppUpdateCheck,
  UPDATE_CHECK_TOAST
} from './app-version-check'

describe('APP_RELEASES_URL', () => {
  it('points at the pierre GitHub releases page', () => {
    expect(APP_RELEASES_URL).toBe('https://github.com/charnould/pierre/releases')
  })
})

describe('UPDATE_CHECK_TOAST', () => {
  it('defines French copy for triggered and dev-only flows', () => {
    expect(UPDATE_CHECK_TOAST.triggered).toContain('Vérification lancée')
    expect(UPDATE_CHECK_TOAST.devOnly).toContain('application installée')
  })
})

describe('isWindowsPlatform', () => {
  it('detects Windows from userAgent', () => {
    expect(
      isWindowsPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'MacIntel')
    ).toBe(true)
  })

  it('detects Windows from platform when userAgent is ambiguous', () => {
    expect(isWindowsPlatform('', 'Win32')).toBe(true)
  })

  it('returns false on macOS', () => {
    expect(
      isWindowsPlatform(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'MacIntel'
      )
    ).toBe(false)
  })

  it('returns false on Linux', () => {
    expect(isWindowsPlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64')).toBe(false)
  })

  it('returns false for empty strings', () => {
    expect(isWindowsPlatform('', '')).toBe(false)
  })

  it('is case-insensitive for Windows markers', () => {
    expect(isWindowsPlatform('windows nt 10.0', 'win32')).toBe(true)
  })
})

describe('resolveUpdateCheckAction', () => {
  it('returns triggered when auto-update check succeeded', () => {
    expect(resolveUpdateCheckAction(true, true)).toBe('triggered')
    expect(resolveUpdateCheckAction(true, false)).toBe('triggered')
  })

  it('returns dev-only when check failed on Windows', () => {
    expect(resolveUpdateCheckAction(false, true)).toBe('dev-only')
  })

  it('returns open-releases when check failed on non-Windows', () => {
    expect(resolveUpdateCheckAction(false, false)).toBe('open-releases')
  })

  it('prioritizes triggered over platform fallback', () => {
    expect(resolveUpdateCheckAction(true, false)).toBe('triggered')
  })
})

describe('update check matrix', () => {
  const cases: Array<{
    triggered: boolean
    userAgent: string
    platform: string
    action: ReturnType<typeof resolveUpdateCheckAction>
  }> = [
    {
      triggered: true,
      userAgent: 'Windows NT 10.0',
      platform: 'Win32',
      action: 'triggered'
    },
    {
      triggered: false,
      userAgent: 'Windows NT 10.0',
      platform: 'Win32',
      action: 'dev-only'
    },
    {
      triggered: false,
      userAgent: 'Macintosh',
      platform: 'MacIntel',
      action: 'open-releases'
    },
    {
      triggered: false,
      userAgent: 'Linux x86_64',
      platform: 'Linux x86_64',
      action: 'open-releases'
    }
  ]

  for (const { triggered, userAgent, platform, action } of cases) {
    it(`triggered=${triggered}, ua=${userAgent.slice(0, 12)}… → ${action}`, () => {
      expect(resolveUpdateCheckAction(triggered, isWindowsPlatform(userAgent, platform))).toBe(
        action
      )
    })
  }
})

describe('runAppUpdateCheck', () => {
  it('returns false when api is missing', async () => {
    const notified: string[] = []
    const result = await runAppUpdateCheck(undefined, '', '', (message) => {
      notified.push(message)
    })
    expect(result).toBe(false)
    expect(notified).toEqual([])
  })

  it('notifies when auto-update check is triggered', async () => {
    const notified: string[] = []
    const result = await runAppUpdateCheck(
      {
        checkForAppUpdates: async () => true,
        openExternal: async () => true
      },
      'Windows NT 10.0',
      'Win32',
      (message) => {
        notified.push(message)
      }
    )

    expect(result).toBe(true)
    expect(notified).toEqual([UPDATE_CHECK_TOAST.triggered])
  })

  it('notifies dev-only on Windows when check is not triggered', async () => {
    const notified: string[] = []
    await runAppUpdateCheck(
      {
        checkForAppUpdates: async () => false,
        openExternal: async () => true
      },
      'Windows NT 10.0',
      'Win32',
      (message) => {
        notified.push(message)
      }
    )

    expect(notified).toEqual([UPDATE_CHECK_TOAST.devOnly])
  })

  it('opens releases page on non-Windows when check is not triggered', async () => {
    let opened = ''
    await runAppUpdateCheck(
      {
        checkForAppUpdates: async () => false,
        openExternal: async (url) => {
          opened = url
          return true
        }
      },
      'Macintosh',
      'MacIntel',
      () => {}
    )

    expect(opened).toBe(APP_RELEASES_URL)
  })
})

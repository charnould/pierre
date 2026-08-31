import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { clearOrgUsersCache } from '@/shared/lib/org-users-cache'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

function polyfillAnimationFrame() {
  const raf = (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
  const caf = (id: number) => window.clearTimeout(id)
  globalThis.requestAnimationFrame = raf
  globalThis.cancelAnimationFrame = caf
  globalThis.window.requestAnimationFrame = raf
  globalThis.window.cancelAnimationFrame = caf
}

const DOM_CTORS = [
  'HTMLElement',
  'HTMLCanvasElement',
  'HTMLImageElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'PointerEvent',
  'KeyboardEvent',
  'MutationObserver'
] as const

function assignFromWindow(source: Window & typeof globalThis) {
  const globals = globalThis as Record<string, unknown>
  const win = source as unknown as Record<string, unknown>
  for (const key of DOM_CTORS) {
    if (typeof globals[key] === 'undefined' && win[key] != null) globals[key] = win[key]
  }
}

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://pierre.test'
    })
    for (const key of ['document', 'window', 'getComputedStyle', ...DOM_CTORS]) {
      originalGlobals.set(key, globals[key])
    }
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    assignFromWindow(dom.window as unknown as Window & typeof globalThis)
    installedDom = true
  } else {
    assignFromWindow(globalThis.window)
    if (typeof globalThis.HTMLCanvasElement === 'undefined') {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
      assignFromWindow(dom.window as unknown as Window & typeof globalThis)
    }
  }
  polyfillAnimationFrame()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

afterEach(() => {
  clearOrgUsersCache()
  mock.restore()
  document.body.replaceChildren()
})

const ME = {
  login: 'alice.martin',
  email: 'alice.martin@exemple.fr',
  role: 'collaborator',
  config: ['default'],
  hasAvatar: true,
  avatarBytes: 12,
  displayName: 'alice.martin'
}

describe('IdentityField', () => {
  test('opens the editor, cancel discards, dialog is a photo cropper', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IdentityField } = await import('./IdentityField')

    const patchMyPreferences = mock(() =>
      Promise.resolve({ data: { hasAvatar: true, displayName: 'alice.martin' } })
    )
    const getUsers = mock(() => Promise.resolve({ users: [ME] }))
    // @ts-expect-error test stub
    globalThis.window.api = { getUsers, patchMyPreferences }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(
        <IdentityField
          url="https://pierre.test"
          email="alice.martin@exemple.fr"
          agentName="Pierre"
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(host.textContent).toContain('Identité')
    expect(host.querySelector('[data-slot="avatar"]')).toBeTruthy()
    expect(host.querySelector('[data-slot="avatar-fallback"]')?.textContent).toContain('AM')

    const open = [...host.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').includes('Modifier votre avatar')
    )
    expect(open).toBeTruthy()
    await act(async () => {
      open!.click()
    })

    expect(
      [...document.querySelectorAll('button')].some((button) => button.textContent === 'Aléatoire')
    ).toBe(false)
    expect(document.querySelector('button[aria-label="Lunettes"]')).toBeNull()
    expect(document.querySelectorAll('input[type="color"]').length).toBe(0)
    expect(document.querySelector('[data-slot="dialog-content"]')?.className).toContain(
      'sm:max-w-md'
    )
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect([...document.querySelectorAll('button')].map((button) => button.textContent)).toEqual(
      expect.arrayContaining(['Choisir une photo', 'Réinitialiser', 'Annuler', 'Enregistrer'])
    )

    const cancel = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Annuler'
    )
    await act(async () => {
      cancel!.click()
    })
    expect(patchMyPreferences).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
  })

  test('rejects the reserved AI name without calling the API', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IdentityField } = await import('./IdentityField')

    const patchMyPreferences = mock(() =>
      Promise.resolve({ data: { hasAvatar: true, displayName: 'alice.martin' } })
    )
    const getUsers = mock(() => Promise.resolve({ users: [ME] }))
    // @ts-expect-error test stub
    globalThis.window.api = { getUsers, patchMyPreferences }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(
        <IdentityField
          url="https://pierre.test"
          email="alice.martin@exemple.fr"
          agentName="Pierre"
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    const input = host.querySelector<HTMLInputElement>('input[aria-label="Nom d’affichage"]')
    expect(input).toBeTruthy()
    await act(async () => {
      const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
      native?.set?.call(input, '  pIeRrE  ')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
      input?.focus()
      input?.blur()
    })

    expect(patchMyPreferences).not.toHaveBeenCalled()
    expect(input?.getAttribute('aria-invalid')).toBe('true')
    expect(host.textContent).toContain('Ce nom est réservé à Pierre.')

    await act(async () => {
      root.unmount()
    })
  })

  test('Choisir une photo uses the native picker when available', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IdentityField } = await import('./IdentityField')

    const bytes = new Uint8Array([1, 2, 3, 4])
    const pickAvatarImage = mock(() =>
      Promise.resolve({
        name: 'avatar.png',
        type: 'image/png',
        buffer: bytes.buffer,
        width: 428,
        height: 640
      })
    )
    const getUsers = mock(() => Promise.resolve({ users: [ME] }))
    // @ts-expect-error test stub
    globalThis.window.api = { getUsers, pickAvatarImage }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(
        <IdentityField
          url="https://pierre.test"
          email="alice.martin@exemple.fr"
          agentName="Pierre"
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    const open = [...host.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').includes('Modifier votre avatar')
    )
    await act(async () => {
      open!.click()
    })
    const choose = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Choisir une photo'
    )
    await act(async () => {
      choose!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(pickAvatarImage).toHaveBeenCalledTimes(1)
    const preview = document.querySelector('[data-slot="dialog-content"] img')
    expect(preview?.getAttribute('src')?.startsWith('data:image/png;base64,')).toBe(true)
    expect(document.querySelector('[data-slot="dialog-content"] [data-slot="slider"]')).toBeTruthy()
    expect(
      document.querySelector('[data-slot="dialog-content"] [data-slot="field-label"]')?.textContent
    ).toBe('Zoom')

    await act(async () => {
      root.unmount()
    })
  })

  test('reset + save clears the stored photo', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IdentityField } = await import('./IdentityField')

    const patchMyPreferences = mock((body: { avatar?: null }) =>
      Promise.resolve({
        data: { hasAvatar: body.avatar === null ? false : true, displayName: 'alice.martin' }
      })
    )
    const getUsers = mock(() => Promise.resolve({ users: [ME] }))
    // @ts-expect-error test stub
    globalThis.window.api = { getUsers, patchMyPreferences }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(
        <IdentityField
          url="https://pierre.test"
          email="alice.martin@exemple.fr"
          agentName="Pierre"
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    const open = [...host.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').includes('Modifier votre avatar')
    )
    await act(async () => {
      open!.click()
    })

    const reset = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Réinitialiser'
    )
    const save = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Enregistrer'
    )
    expect(reset).toBeTruthy()
    await act(async () => {
      reset!.click()
    })
    await act(async () => {
      save!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(patchMyPreferences).toHaveBeenCalledTimes(1)
    expect(patchMyPreferences.mock.calls[0]![0]).toMatchObject({
      url: 'https://pierre.test',
      avatar: null
    })

    await act(async () => {
      root.unmount()
    })
  })

  test('Enregistrer after pick uploads the cropped photo', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { IdentityField } = await import('./IdentityField')

    const bytes = new Uint8Array([1, 2, 3, 4])
    const pickAvatarImage = mock(() =>
      Promise.resolve({
        name: 'avatar.png',
        type: 'image/png',
        buffer: bytes.buffer,
        width: 428,
        height: 640
      })
    )
    const uploadMyAvatar = mock(() =>
      Promise.resolve({ data: { hasAvatar: true, displayName: 'alice.martin' } })
    )
    const getUsers = mock(() => Promise.resolve({ users: [ME] }))
    // @ts-expect-error test stub
    globalThis.window.api = { getUsers, pickAvatarImage, uploadMyAvatar }

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const originalToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.getContext = (() => ({
      drawImage() {}
    })) as unknown as typeof originalGetContext
    HTMLCanvasElement.prototype.toBlob = function (callback, type) {
      callback(new Blob([new Uint8Array([9, 9, 9])], { type: type || 'image/webp' }))
    }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    try {
      await act(async () => {
        root.render(
          <IdentityField
            url="https://pierre.test"
            email="alice.martin@exemple.fr"
            agentName="Pierre"
          />
        )
      })
      await act(async () => {
        await Promise.resolve()
      })

      const open = [...host.querySelectorAll('button')].find((button) =>
        (button.textContent ?? '').includes('Modifier votre avatar')
      )
      await act(async () => {
        open!.click()
      })
      const choose = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Choisir une photo'
      )
      await act(async () => {
        choose!.click()
      })
      await act(async () => {
        await Promise.resolve()
      })

      const img = document.querySelector('[data-slot="dialog-content"] img') as HTMLImageElement
      Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 428 })
      Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 640 })

      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Enregistrer'
      )
      await act(async () => {
        save!.click()
      })
      await act(async () => {
        await Promise.resolve()
      })

      expect(uploadMyAvatar).toHaveBeenCalledTimes(1)
      const firstCall = uploadMyAvatar.mock.calls[0] as unknown as [
        { url: string; name: string; type: string; buffer: ArrayBuffer }
      ]
      expect(firstCall).toBeDefined()
      const payload = firstCall[0]
      expect(payload).toMatchObject({
        url: 'https://pierre.test',
        name: 'avatar.webp',
        type: 'image/webp'
      })
      expect(payload.buffer.byteLength).toBeGreaterThan(0)
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext
      HTMLCanvasElement.prototype.toBlob = originalToBlob
      await act(async () => {
        root.unmount()
      })
    }
  })

  test.each(['UNREADABLE_AVATAR', 'ETIMEDOUT'])(
    'picker failure %s explains copying to the desktop',
    async (message) => {
      const { act } = await import('react')
      const { createRoot } = await import('react-dom/client')
      const { toast } = await import('@/shared/components/ui/toast')
      const { IdentityField } = await import('./IdentityField')

      const add = mock()
      const previousAdd = toast.add
      toast.add = add as typeof toast.add

      const pickAvatarImage = mock(() => Promise.reject(new Error(message)))
      const getUsers = mock(() => Promise.resolve({ users: [ME] }))
      // @ts-expect-error test stub
      globalThis.window.api = { getUsers, pickAvatarImage }

      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)

      try {
        await act(async () => {
          root.render(
            <IdentityField
              url="https://pierre.test"
              email="alice.martin@exemple.fr"
              agentName="Pierre"
            />
          )
        })
        await act(async () => {
          await Promise.resolve()
        })

        const open = [...host.querySelectorAll('button')].find((button) =>
          (button.textContent ?? '').includes('Modifier votre avatar')
        )
        await act(async () => {
          open!.click()
        })
        const choose = [...document.querySelectorAll('button')].find(
          (button) => button.textContent === 'Choisir une photo'
        )
        await act(async () => {
          choose!.click()
        })
        await act(async () => {
          await Promise.resolve()
        })

        expect(pickAvatarImage).toHaveBeenCalledTimes(1)
        expect(add).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title:
              'Ce fichier n’est pas disponible en local (Drive, iCloud…). Copiez-le sur le Bureau, puis réessayez.'
          })
        )
      } finally {
        toast.add = previousAdd
        await act(async () => {
          root.unmount()
        })
      }
    }
  )
})

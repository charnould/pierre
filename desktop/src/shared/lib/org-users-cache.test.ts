import { afterEach, describe, expect, mock, test } from 'bun:test'

import { bytesToDataUri } from '../lib/avatar/data-uri'
import {
  applyLocalAvatar,
  clearOrgUsersCache,
  ensureUserAvatar,
  fetchOrgUsers,
  formatOrgCollaboratorLabel,
  resolveOrgUser,
  resolveOrgUserByLoginOrEmail,
  resolveOrgUserDisplayName,
  resolveOrgUsersUrl,
  resolveUserAvatar
} from '../lib/org-users-cache'

const PHOTO = 'data:image/webp;base64,QQ=='

const USERS = [
  {
    login: 'amartin',
    email: 'amartin@exemple.fr',
    hasAvatar: false,
    avatarBytes: 0,
    avatarVersion: 0,
    displayName: 'amartin'
  },
  {
    login: 'cdubois',
    email: 'cdubois@exemple.fr',
    hasAvatar: true,
    avatarBytes: 3,
    avatarVersion: 1,
    displayName: 'Camille Dubois'
  }
]

let didStubApi = false
let createdWindow = false
let apiBeforeStub: unknown

function stubWindowApi(api: Record<string, unknown>) {
  didStubApi = true
  if (globalThis.window) {
    apiBeforeStub = globalThis.window.api
    globalThis.window.api = api as typeof window.api
    return
  }
  createdWindow = true
  globalThis.window = { api } as unknown as Window & typeof globalThis
}

afterEach(() => {
  clearOrgUsersCache()
  mock.restore()
  if (!didStubApi) return
  if (createdWindow) delete (globalThis as { window?: Window }).window
  else if (globalThis.window) {
    if (apiBeforeStub === undefined) delete (globalThis.window as { api?: unknown }).api
    else globalThis.window.api = apiBeforeStub as typeof window.api
  }
  didStubApi = false
  createdWindow = false
  apiBeforeStub = undefined
})

describe('org-users-cache', () => {
  test('fetchOrgUsers charge via getUsers et met en cache', async () => {
    const getUsers = mock(() => Promise.resolve({ data: USERS }))
    stubWindowApi({ getUsers })

    await expect(fetchOrgUsers('https://pierre.test')).resolves.toEqual(USERS)
    await expect(fetchOrgUsers('https://pierre.test')).resolves.toEqual(USERS)
    expect(getUsers).toHaveBeenCalledTimes(1)
    expect(getUsers).toHaveBeenCalledWith({ url: 'https://pierre.test' })
  })

  test('fetchOrgUsers déduplique les appels en vol', async () => {
    const getUsers = mock(
      () =>
        new Promise<{ data: typeof USERS }>((resolve) => {
          setTimeout(() => resolve({ data: USERS }), 20)
        })
    )
    stubWindowApi({ getUsers })

    const [a, b] = await Promise.all([
      fetchOrgUsers('https://pierre.test'),
      fetchOrgUsers('https://pierre.test')
    ])
    expect(a).toEqual(USERS)
    expect(b).toEqual(USERS)
    expect(getUsers).toHaveBeenCalledTimes(1)
  })

  test('conserve le dernier serveur demandé malgré une réponse plus ancienne', async () => {
    const resolvers = new Map<string, (value: { data: typeof USERS }) => void>()
    stubWindowApi({
      getUsers: mock(
        ({ url }: { url: string }) =>
          new Promise<{ data: typeof USERS }>((resolve) => {
            resolvers.set(url, resolve)
          })
      )
    })
    const first = fetchOrgUsers('https://one.test')
    const second = fetchOrgUsers('https://two.test')

    resolvers.get('https://two.test')?.({
      data: [{ ...USERS[0]!, displayName: 'Serveur deux' }, USERS[1]!]
    })
    await second
    resolvers.get('https://one.test')?.({
      data: [{ ...USERS[0]!, displayName: 'Serveur un' }, USERS[1]!]
    })
    await first

    expect(resolveOrgUser('amartin')?.displayName).toBe('Serveur deux')
  })

  test('fetchOrgUsers retourne [] si getUsers échoue sans mettre en cache', async () => {
    const getUsers = mock(() => Promise.resolve(null))
    stubWindowApi({ getUsers })

    await expect(fetchOrgUsers('https://pierre.test')).resolves.toEqual([])
    await expect(fetchOrgUsers('https://pierre.test')).resolves.toEqual([])
    expect(getUsers).toHaveBeenCalledTimes(2)
  })

  test('fetchOrgUsers retourne [] si getUsers est absent', async () => {
    stubWindowApi({})
    await expect(fetchOrgUsers('https://pierre.test')).resolves.toEqual([])
  })

  test('resolveOrgUsersUrl préfère l’URL fournie', async () => {
    const getSettings = mock(() => Promise.resolve({ url: 'https://ignored.test' }))
    stubWindowApi({ getSettings })

    await expect(resolveOrgUsersUrl('https://explicit.test')).resolves.toBe('https://explicit.test')
    expect(getSettings).not.toHaveBeenCalled()
  })

  test('resolveOrgUsersUrl lit getSettings en fallback', async () => {
    const getSettings = mock(() => Promise.resolve({ url: 'https://from-settings.test' }))
    stubWindowApi({ getSettings })

    await expect(resolveOrgUsersUrl(undefined)).resolves.toBe('https://from-settings.test')
  })

  test('formatOrgCollaboratorLabel : displayName custom → login → email brut', async () => {
    const getUsers = mock(() => Promise.resolve({ data: USERS }))
    stubWindowApi({ getUsers })
    await fetchOrgUsers('https://pierre.test')

    expect(resolveOrgUserByLoginOrEmail('cdubois@exemple.fr')?.login).toBe('cdubois')
    expect(resolveOrgUserByLoginOrEmail('user:cdubois@exemple.fr')?.login).toBe('cdubois')
    expect(formatOrgCollaboratorLabel('cdubois@exemple.fr')).toBe('Camille Dubois')
    expect(formatOrgCollaboratorLabel('user:cdubois@exemple.fr')).toBe('Camille Dubois')
    expect(formatOrgCollaboratorLabel('amartin@exemple.fr')).toBe('amartin')
    expect(formatOrgCollaboratorLabel('amartin')).toBe('amartin')
    expect(formatOrgCollaboratorLabel('inconnu@exemple.fr')).toBe('inconnu@exemple.fr')
    expect(formatOrgCollaboratorLabel('inconnu@exemple.fr', 'ghost')).toBe('ghost')
    expect(formatOrgCollaboratorLabel('')).toBe('')
  })

  test('fetchOrgUsers ne télécharge aucun avatar', async () => {
    const getAvatar = mock(() => Promise.resolve(new Uint8Array([1]).buffer))
    stubWindowApi({
      getUsers: mock(() => Promise.resolve({ data: USERS })),
      getAvatar
    })
    await fetchOrgUsers('https://pierre.test')
    await Promise.resolve()
    expect(getAvatar).not.toHaveBeenCalled()
  })

  test('ensureUserAvatar charge une photo, la déduplique et ignore un compte sans photo', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const getAvatar = mock(() => Promise.resolve(bytes.buffer))
    stubWindowApi({
      getUsers: mock(() => Promise.resolve({ data: USERS })),
      getAvatar
    })
    await fetchOrgUsers('https://pierre.test')

    ensureUserAvatar('cdubois')
    ensureUserAvatar('cdubois@exemple.fr')
    ensureUserAvatar('amartin')
    await Promise.resolve()

    expect(getAvatar).toHaveBeenCalledTimes(1)
    expect(getAvatar).toHaveBeenCalledWith({
      url: 'https://pierre.test',
      email: 'cdubois@exemple.fr'
    })
    expect(resolveUserAvatar('cdubois')).toBe(bytesToDataUri(bytes, 'image/webp'))
  })

  test('hydrate les photos via getAvatar et applique une mise à jour locale', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const getUsers = mock(() => Promise.resolve({ data: USERS }))
    const getAvatar = mock(() => Promise.resolve(bytes.buffer))
    stubWindowApi({ getUsers, getAvatar })
    await fetchOrgUsers('https://pierre.test')
    ensureUserAvatar('cdubois')
    await Promise.resolve()
    expect(getAvatar).toHaveBeenCalledWith({
      url: 'https://pierre.test',
      email: 'cdubois@exemple.fr'
    })
    expect(getAvatar).toHaveBeenCalledTimes(1)
    expect(resolveUserAvatar('amartin')).toBeNull()
    expect(resolveUserAvatar('cdubois')).toBe(bytesToDataUri(bytes, 'image/webp'))

    applyLocalAvatar('cdubois', PHOTO, 'Camille')
    expect(resolveUserAvatar('cdubois')).toBe(PHOTO)
    expect(resolveOrgUser('cdubois')?.displayName).toBe('Camille')
  })

  test('ensureUserAvatar recharge la photo quand sa version change', async () => {
    let version = 1
    const getAvatar = mock(() => Promise.resolve(new Uint8Array([version]).buffer))
    stubWindowApi({
      getUsers: mock(() =>
        Promise.resolve({
          data: [{ ...USERS[1]!, avatarVersion: version }]
        })
      ),
      getAvatar
    })

    await fetchOrgUsers('https://pierre.test')
    ensureUserAvatar('cdubois')
    await Promise.resolve()
    clearOrgUsersCache()
    version = 2
    await fetchOrgUsers('https://pierre.test')
    ensureUserAvatar('cdubois')
    await Promise.resolve()

    expect(getAvatar).toHaveBeenCalledTimes(2)
  })

  test('isole les comptes qui partagent le même local-part', async () => {
    const users = [
      { ...USERS[1]!, login: 'alice', email: 'alice@one.test', avatarVersion: 1 },
      { ...USERS[1]!, login: 'alice', email: 'alice@two.test', avatarVersion: 2 }
    ]
    const getAvatar = mock(({ email }: { email: string }) =>
      Promise.resolve(new TextEncoder().encode(email).buffer)
    )
    stubWindowApi({
      getUsers: mock(() => Promise.resolve({ data: users })),
      getAvatar
    })
    await fetchOrgUsers('https://pierre.test')
    ensureUserAvatar('alice@one.test')
    ensureUserAvatar('alice@two.test')
    await Promise.resolve()

    expect(resolveOrgUser('alice')).toBeNull()
    expect(resolveUserAvatar('alice@one.test')).not.toBe(resolveUserAvatar('alice@two.test'))
    expect(getAvatar).toHaveBeenCalledTimes(2)
  })

  test('isole les photos de comptes identiques entre serveurs', async () => {
    const getAvatar = mock(({ url }: { url: string }) =>
      Promise.resolve(new TextEncoder().encode(url).buffer)
    )
    stubWindowApi({
      getUsers: mock(() => Promise.resolve({ data: USERS })),
      getAvatar
    })

    await fetchOrgUsers('https://pierre.test/Org')
    ensureUserAvatar('cdubois@exemple.fr')
    await Promise.resolve()
    const first = resolveUserAvatar('cdubois@exemple.fr')
    await fetchOrgUsers('https://pierre.test/org')
    ensureUserAvatar('cdubois@exemple.fr')
    await Promise.resolve()

    expect(resolveUserAvatar('cdubois@exemple.fr')).not.toBe(first)
    expect(getAvatar).toHaveBeenCalledTimes(2)
  })

  test('résout avatar, user et displayName par email comme par login', async () => {
    const getUsers = mock(() => Promise.resolve({ data: USERS }))
    stubWindowApi({ getUsers })
    await fetchOrgUsers('https://pierre.test')

    applyLocalAvatar('cdubois', PHOTO)
    expect(resolveUserAvatar('cdubois@exemple.fr')).toBe(PHOTO)
    expect(resolveUserAvatar('user:cdubois@exemple.fr')).toBe(PHOTO)
    expect(resolveUserAvatar('CDubois@Exemple.fr')).toBe(PHOTO)
    expect(resolveOrgUser('cdubois@exemple.fr')?.login).toBe('cdubois')
    expect(resolveOrgUserDisplayName('cdubois@exemple.fr')).toBe('Camille Dubois')
    expect(resolveOrgUserDisplayName('user:cdubois@exemple.fr')).toBe('Camille Dubois')
    expect(resolveOrgUserDisplayName('cdubois')).toBe('Camille Dubois')
    expect(resolveUserAvatar('inconnu@exemple.fr')).toBeNull()
    expect(resolveUserAvatar('')).toBeNull()
  })

  test('applyLocalAvatar reste visible via l’email d’activité (user:email)', async () => {
    const getUsers = mock(() => Promise.resolve({ data: USERS }))
    stubWindowApi({ getUsers })
    await fetchOrgUsers('https://pierre.test')

    applyLocalAvatar('cdubois', PHOTO, 'Camille')
    expect(resolveUserAvatar('cdubois@exemple.fr')).toBe(PHOTO)
    expect(resolveOrgUser('cdubois@exemple.fr')?.displayName).toBe('Camille')
    expect(resolveOrgUserDisplayName('cdubois@exemple.fr')).toBe('Camille')

    applyLocalAvatar('cdubois@exemple.fr', 'data:image/webp;base64,Qg==', 'Camille Dubois')
    expect(resolveUserAvatar('cdubois')).toBe('data:image/webp;base64,Qg==')
    expect(resolveUserAvatar('cdubois@exemple.fr')).toBe('data:image/webp;base64,Qg==')
  })

  test('applyLocalAvatar sans cache org reste limité à son identifiant exact', () => {
    applyLocalAvatar('cdubois', PHOTO)
    expect(resolveUserAvatar('cdubois')).toBe(PHOTO)
    expect(resolveUserAvatar('cdubois@exemple.fr')).toBeNull()
  })

  test('applyLocalAvatar(undefined) ne touche pas la photo', () => {
    applyLocalAvatar('cdubois', PHOTO)
    applyLocalAvatar('cdubois', undefined, 'Camille')
    expect(resolveUserAvatar('cdubois')).toBe(PHOTO)
  })
})

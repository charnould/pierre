export const APP_RELEASES_URL = 'https://github.com/charnould/pierre/releases'

export const UPDATE_CHECK_TOAST = {
  triggered: 'Vérification lancée. Un message apparaîtra si une mise à jour est disponible.',
  devOnly: 'Disponible uniquement dans l’application installée.'
} as const

export type UpdateCheckAction = 'triggered' | 'dev-only' | 'open-releases'

export function isWindowsPlatform(userAgent: string, platform: string): boolean {
  return /Windows/i.test(userAgent) || /Win/i.test(platform)
}

export function resolveUpdateCheckAction(
  triggered: boolean,
  isWindows: boolean
): UpdateCheckAction {
  if (triggered) return 'triggered'
  if (isWindows) return 'dev-only'
  return 'open-releases'
}

type AppUpdateCheckApi = Pick<Window['api'], 'checkForAppUpdates' | 'openExternal'>

export async function runAppUpdateCheck(
  api: AppUpdateCheckApi | undefined,
  userAgent: string,
  platform: string,
  notify: (message: string) => void
): Promise<boolean> {
  if (!api?.checkForAppUpdates) return false

  const triggered = await api.checkForAppUpdates()
  const action = resolveUpdateCheckAction(triggered, isWindowsPlatform(userAgent, platform))

  if (action === 'triggered') {
    notify(UPDATE_CHECK_TOAST.triggered)
    return true
  }

  if (action === 'dev-only') {
    notify(UPDATE_CHECK_TOAST.devOnly)
    return true
  }

  await api.openExternal(APP_RELEASES_URL)
  return true
}

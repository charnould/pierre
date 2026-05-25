export const UPDATER_REPO = 'charnould/pierre' as const

export function shouldEnableAutoUpdater(platform: NodeJS.Platform, isPackaged: boolean): boolean {
  return isPackaged && platform === 'win32'
}

export function updaterOptions() {
  return { repo: UPDATER_REPO, updateInterval: '1 hour' as const }
}

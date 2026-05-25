import { shouldEnableAutoUpdater } from '../auto-updater'

export function triggerAppUpdateCheck(
  platform: NodeJS.Platform,
  isPackaged: boolean,
  checkForUpdates: () => unknown
): boolean {
  if (!shouldEnableAutoUpdater(platform, isPackaged)) return false
  void checkForUpdates()
  return true
}

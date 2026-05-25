export type AppPlatform = 'mac' | 'win'

export function getAppPlatform(): AppPlatform {
  if (typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')) {
    return 'mac'
  }
  return 'win'
}

/** Shell top inset under the title bar — mac: 8px, win: 12px */
export function shellTopClass(platform: AppPlatform): string {
  return platform === 'mac' ? 'pt-2' : 'pt-3'
}

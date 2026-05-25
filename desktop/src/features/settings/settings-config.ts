import { warnRenderer } from '@/shared/lib/renderer-log'

export interface DesktopConfig {
  name: string
  headline: string
  organization: string
  ticket_url_pattern?: string
  /** URL de connexion à l’agence virtuelle (sans paramètre de réclamation). */
  aravis_login_url?: string
}

export async function fetchConfig(baseUrl: string): Promise<DesktopConfig | null> {
  try {
    const resp = await fetch(`${baseUrl}/customization/desktop/config.json`)
    if (!resp.ok) return null
    return (await resp.json()) as DesktopConfig
  } catch (error) {
    warnRenderer('settings.fetchConfig', error)
    return null
  }
}

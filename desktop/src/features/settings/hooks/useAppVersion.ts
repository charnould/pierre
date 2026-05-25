import { useEffect, useState } from 'react'

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api?.getAppVersion) return
    void window.api.getAppVersion().then(setVersion)
  }, [])

  return version
}

import type { Tab } from '../../App'

interface Props {
  activeTab: Tab
  isLoggedIn: boolean
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')

export function TitleBar({ activeTab: _activeTab, isLoggedIn: _isLoggedIn }: Props) {
  return (
    <div className="drag bg-background relative z-20 flex h-8 w-full shrink-0 items-center">
      {/* Traffic-light clearance (macOS only) */}
      {isMac && <div className="w-[90px] shrink-0" />}
    </div>
  )
}

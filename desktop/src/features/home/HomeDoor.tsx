import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { PANEL_IDENTITY } from '@/shared/lib/panel-identity'
import { preloadTab } from '@/shared/lib/preload-tab'
import { tabNavLabel, type Tab } from '@/shared/lib/tab-registry'

/** Thin alias of ChoiceTile — Home métier door. */
export function HomeDoor({
  tab,
  agentName,
  onNavigate
}: {
  tab: Tab
  agentName: string
  onNavigate: (tab: Tab) => void
}) {
  const identity = PANEL_IDENTITY[tab]
  const Icon = identity.icon
  return (
    <ChoiceTile
      as="button"
      interactive
      data-door={tab}
      className="min-w-0 items-center text-start"
      icon={<Icon className="size-5" strokeWidth={2} />}
      title={tabNavLabel(tab, agentName)}
      onPointerEnter={() => preloadTab(tab)}
      onClick={() => onNavigate(tab)}
    />
  )
}

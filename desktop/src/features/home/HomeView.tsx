import { motion, useReducedMotion } from 'motion/react'

import { PANEL_IDENTITY } from '@/shared/lib/panel-identity'
import { preloadTab } from '@/shared/lib/preload-tab'
import { isPanelTabVisible, tabNavLabel } from '@/shared/lib/tab-registry'
import type { Tab } from '@/shared/lib/tabs'
import { cn } from '@/shared/lib/utils'

/** Visual composition — not sidebar order. Chat is the door; the rest orbit. */
const HOME_TILES = [
  'chat',
  'tickets',
  'repayment',
  'automations',
  'bulk',
  'about',
  'insurance-attestation',
  'relocation',
  'attributions',
  'ventes'
] as const satisfies readonly Tab[]

const VISIBLE_HOME_TILES = HOME_TILES.filter(isPanelTabVisible)

const HOME_TILE_COLUMNS = Math.max(1, Math.ceil(Math.sqrt(VISIBLE_HOME_TILES.length)))
const HOME_TILE_FLEX =
  `1 1 calc((100% - ${(HOME_TILE_COLUMNS - 1) * 8}px) / ${HOME_TILE_COLUMNS})` as const

const TILE_MATERIAL: Record<(typeof HOME_TILES)[number], string> = {
  chat: 'home-tile-1',
  tickets: 'home-tile-2',
  repayment: 'home-tile-3',
  automations: 'home-tile-4',
  bulk: 'home-tile-8',
  about: 'home-tile-5',
  'insurance-attestation': 'home-tile-6',
  relocation: 'home-tile-7',
  attributions: 'home-tile-9',
  ventes: 'home-tile-10'
}

const TILE_CHROME = 'home-tile relative h-full overflow-hidden rounded-2xl text-white'

const TILE_ENTER =
  'translate-y-0 opacity-100 transition-[opacity,translate] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-1.5 starting:opacity-0 motion-reduce:duration-150 motion-reduce:starting:translate-y-0'

const SPRING = { type: 'spring', bounce: 0, visualDuration: 0.5 } as const
const SPRING_TAP = { type: 'spring', bounce: 0, visualDuration: 0.18 } as const

const iconHover = {
  rest: { scale: 1, opacity: 0.7, transition: SPRING },
  hover: { scale: 1.55, opacity: 0.9, transition: SPRING }
}

const titleHover = {
  rest: { y: 0, transition: SPRING },
  hover: { y: -8, transition: { ...SPRING, delay: 0.09 } }
}

interface Props {
  hidden: boolean
  onNavigate: (tab: Tab) => void
  agentName: string
}

function tileDelayMs(index: number) {
  return 80 + index * 55
}

function HomeNavTile({
  tab,
  agentName,
  onNavigate,
  delayMs
}: {
  tab: (typeof HOME_TILES)[number]
  agentName: string
  onNavigate: (tab: Tab) => void
  delayMs: number
}) {
  const identity = PANEL_IDENTITY[tab]!
  const Icon = identity.icon
  const reduceMotion = useReducedMotion()

  return (
    <div
      className={cn('@container min-h-0 min-w-0', TILE_ENTER)}
      style={{ flex: HOME_TILE_FLEX, transitionDelay: `${delayMs}ms` }}
    >
      <motion.button
        type="button"
        className={cn(
          'focus-visible:ring-ring/50 h-full w-full origin-center text-start outline-none focus-visible:ring-[3px]',
          TILE_CHROME,
          TILE_MATERIAL[tab]
        )}
        initial="rest"
        animate="rest"
        whileHover={reduceMotion ? undefined : 'hover'}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        transition={SPRING_TAP}
        onPointerEnter={() => preloadTab(tab)}
        onClick={() => onNavigate(tab)}
      >
        <div className="flex h-full min-h-0 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2 overflow-visible">
            <motion.span
              aria-hidden
              className="inline-flex origin-top-left will-change-transform"
              style={{ originX: 0, originY: 0 }}
              variants={iconHover}
            >
              <Icon className="size-[clamp(6rem,32cqw,9rem)] text-white" strokeWidth={1.5} />
            </motion.span>
          </div>
          <motion.span
            className="mt-auto block text-[clamp(1.25rem,9cqw,2rem)] leading-[1.15] font-medium tracking-tight text-balance text-white"
            variants={titleHover}
          >
            {tabNavLabel(tab, agentName)}
          </motion.span>
        </div>
      </motion.button>
    </div>
  )
}

export function HomeView({ hidden, onNavigate, agentName }: Props) {
  return (
    <div
      data-tab-panel
      aria-label="Accueil"
      className={cn(
        'bg-background absolute inset-0 flex min-h-0 flex-col p-2 [background-image:var(--home-bloom)] transition-[opacity,translate]',
        hidden
          ? 'pointer-events-none z-0 -translate-y-1.5 opacity-0 duration-[180ms] ease-[cubic-bezier(0.4,0,1,1)]'
          : 'z-1 translate-y-0 opacity-100 duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'motion-reduce:translate-y-0 motion-reduce:duration-150'
      )}
    >
      <nav
        className="flex min-h-0 w-full flex-1 flex-wrap content-stretch gap-2"
        aria-label="Métiers"
      >
        {VISIBLE_HOME_TILES.map((tab, index) => (
          <HomeNavTile
            key={tab}
            tab={tab}
            agentName={agentName}
            onNavigate={onNavigate}
            delayMs={tileDelayMs(index)}
          />
        ))}
      </nav>
    </div>
  )
}

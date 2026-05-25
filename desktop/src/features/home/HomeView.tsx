import { FolderGit2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'

import {
  homeActionTileClassName,
  homeGridClassName,
  homeHeadlineClassName,
  homeHeadlineSubClassName,
  homeInfoBodyClassName,
  homeInfoFooterClassName,
  homeInfoIconClassName,
  homeInfoLinkClassName,
  homeInfoTileClassName,
  homeInfoVersionClassName,
  homeTileFillStyle,
  homeTileIconClassName,
  homeTileKbdClassName,
  homeTileLabelClassName
} from '@/features/home/home-ui'
import { useAppVersion } from '@/features/settings/hooks/useAppVersion'
import { EASE, EASE_IN } from '@/features/workflow/components/WorkflowPanelChrome'
import { isTypingInField } from '@/features/workflow/lib/workflow-keyboard'
import { Card } from '@/shared/components/ui/card'
import { DeskContent, DeskShell } from '@/shared/components/ui/desk-shell'
import { Kbd } from '@/shared/components/ui/kbd'
import { PANEL_IDENTITY, PANEL_NAV_TABS } from '@/shared/lib/panel-identity'
import { isFocusInHiddenPanel } from '@/shared/lib/release-hidden-panel-focus'
import type { Tab } from '@/shared/lib/tabs'

interface ActionDef {
  key?: string
  tab?: Tab
  info?: boolean
}

const GITHUB_URL = 'https://github.com/charnould/pierre'
const CONTACT_EMAIL = 'charnould@pierre-ia.org'

const HOME_TILE_SHORTCUT_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const

const ACTIONS: ActionDef[] = [
  ...PANEL_NAV_TABS.map((tab, index) => ({
    key: HOME_TILE_SHORTCUT_KEYS[index],
    tab
  })),
  { info: true }
]

interface Props {
  hidden: boolean
  onNavigate: (tab: Tab) => void
  agentName: string
}

const stagger = { animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const tile = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  hover: {},
  tap: {}
}

const TILE_SPRING_HOVER = {
  type: 'spring',
  stiffness: 460,
  damping: 11,
  mass: 0.75
} as const

const TILE_SPRING_TAP = {
  type: 'spring',
  stiffness: 620,
  damping: 9,
  mass: 0.62
} as const

function tileContentVariants(
  reduceMotion: boolean | null,
  hoverScale: number,
  tapScale: number,
  tapY: number,
  hoverY = -1
) {
  const rest = { y: 0, scale: 1 }

  if (reduceMotion) {
    return { initial: rest, animate: rest, hover: rest, tap: rest }
  }

  return {
    initial: rest,
    animate: rest,
    hover: { y: hoverY, scale: hoverScale, transition: TILE_SPRING_HOVER },
    tap: { y: tapY, scale: tapScale, transition: TILE_SPRING_TAP }
  }
}

function HomeInfoTile({ agentName }: { agentName: string }) {
  const appVersion = useAppVersion()

  return (
    <Card className={homeInfoTileClassName}>
      <div className={homeInfoIconClassName} aria-hidden>
        <FolderGit2 strokeWidth={1.5} />
      </div>
      <div className={homeInfoFooterClassName}>
        <div className={homeInfoBodyClassName}>
          <p>
            Une idée, un bug, une question ?{' '}
            <button
              type="button"
              className={homeInfoLinkClassName}
              onClick={() => void window.api.openExternal(`mailto:${CONTACT_EMAIL}`)}
            >
              Envoyez un email
            </button>{' '}
            ou{' '}
            <button
              type="button"
              className={homeInfoLinkClassName}
              onClick={() => void window.api.openExternal(GITHUB_URL)}
            >
              créez un ticket sur GitHub
            </button>
            .
          </p>
          <p>
            PIERRE
            {agentName.toLowerCase() !== 'pierre' ? ` (ici nommé ${agentName})` : null} est un
            projet open source au service du mouvement HLM.
          </p>
          <p>
            Il vous sert ?{' '}
            <button
              type="button"
              className={homeInfoLinkClassName}
              onClick={() => void window.api.openExternal(`mailto:${CONTACT_EMAIL}`)}
            >
              Sponsorisez-le
            </button>
            .
          </p>
        </div>
        <span className={homeInfoVersionClassName}>ALPHA · v{appVersion ?? '…'}</span>
      </div>
    </Card>
  )
}

export function HomeView({ hidden, onNavigate, agentName }: Props) {
  const reduceMotion = useReducedMotion()
  const iconVariants = tileContentVariants(reduceMotion, 1.22, 0.94, 2, -4)
  const labelVariants = tileContentVariants(reduceMotion, 1.01, 0.98, 3)

  useEffect(() => {
    if (hidden) return
    function onKey(e: KeyboardEvent) {
      if (isTypingInField(e.target) && !isFocusInHiddenPanel(e.target)) return

      const action = ACTIONS.find((a) => a.key === e.key)
      if (action?.tab) {
        e.preventDefault()
        onNavigate(action.tab)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, onNavigate])

  return (
    <motion.div
      className="tab-panel bg-background absolute inset-0 flex min-h-0 flex-col"
      initial={false}
      animate={hidden ? { opacity: 0, y: reduceMotion ? 0 : -6 } : { opacity: 1, y: 0 }}
      transition={
        hidden
          ? { duration: reduceMotion ? 0 : 0.18, ease: EASE_IN }
          : { duration: reduceMotion ? 0 : 0.28, ease: EASE }
      }
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: hidden ? 0 : 1
      }}
    >
      <DeskShell className="min-h-0 flex-1">
        <DeskContent className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <p className={homeHeadlineClassName}>
            C'est {agentName} ٩(◕‿◕｡)۶
            <span className={homeHeadlineSubClassName}>Comment puis-je vous aider ?</span>
          </p>

          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className={homeGridClassName}
          >
            {ACTIONS.map((action) => {
              if (action.info) {
                return (
                  <motion.div key="info" variants={tile} className="h-full">
                    <HomeInfoTile agentName={agentName} />
                  </motion.div>
                )
              }

              const identity = PANEL_IDENTITY[action.tab!]!
              const Icon = identity.icon

              return (
                <motion.button
                  key={action.key}
                  type="button"
                  variants={tile}
                  whileHover={reduceMotion ? undefined : 'hover'}
                  whileTap={reduceMotion ? undefined : 'tap'}
                  aria-keyshortcuts={action.key}
                  onClick={() => onNavigate(action.tab!)}
                  className={homeActionTileClassName}
                  style={homeTileFillStyle(action.tab!)}
                >
                  <Kbd aria-hidden className={homeTileKbdClassName}>
                    {action.key}
                  </Kbd>
                  <motion.div className={homeTileIconClassName} aria-hidden variants={iconVariants}>
                    <Icon strokeWidth={1.5} />
                  </motion.div>
                  <motion.span className={homeTileLabelClassName} variants={labelVariants}>
                    {identity.label}
                  </motion.span>
                </motion.button>
              )
            })}
          </motion.div>
        </DeskContent>
      </DeskShell>
    </motion.div>
  )
}

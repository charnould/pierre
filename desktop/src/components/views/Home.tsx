import { Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'

import { EASE, EASE_IN } from '@/components/workflow/WorkflowPanelChrome'

import type { Tab } from '../../App'
import { REPAYMENT_PLAN_ENABLED } from '../../lib/feature-flags'
import { PANEL_IDENTITY } from '../../lib/panel-identity'
import { isTypingInField } from '../../lib/workflow-keyboard'

interface ActionDef {
  key: string
  tab?: Tab
  info?: boolean
}

const ACTIONS: ActionDef[] = [
  { key: 'a', tab: 'chat' },
  { key: 'b', tab: 'request' },
  { key: 'c', tab: 'about' },
  ...(REPAYMENT_PLAN_ENABLED ? [{ key: 'd', tab: 'repayment' as const }] : []),
  { key: 'e', info: true }
]

interface Props {
  hidden: boolean
  onNavigate: (tab: Tab) => void
  agentName: string
}

const stagger = { animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }
const tile = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } }
}

export function Home({ hidden, onNavigate, agentName }: Props) {
  useEffect(() => {
    if (hidden) return
    function onKey(e: KeyboardEvent) {
      if (isTypingInField(e.target)) return
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
      animate={hidden ? { opacity: 0, scale: 0.985, y: -8 } : { opacity: 1, scale: 1, y: 0 }}
      transition={hidden ? { duration: 0.22, ease: EASE_IN } : { duration: 0.35, ease: EASE }}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: hidden ? 0 : 1
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col p-10 pt-3">
        <p className="font-montagu text-foreground mb-6 shrink-0 text-4xl/[42px]">
          C'est {agentName} ٩(◕‿◕｡)۶ · ᴀʟᴘʜᴀ
          <br />
          comment puis-je vous assister ?
        </p>

        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="min-h-0 flex-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gridAutoRows: '1fr',
            gap: '12px'
          }}
        >
          {ACTIONS.map((action) => {
            if (action.info) {
              return (
                <motion.div
                  key={action.key}
                  variants={tile}
                  className="border-border bg-muted/30 flex cursor-default flex-col items-start justify-between rounded-2xl border p-5 text-left"
                >
                  <div className="text-muted-foreground/30">
                    <Mail size={64} strokeWidth={1.2} />
                  </div>
                  <span className="font-montagu text-muted-foreground mt-auto text-[12px] leading-snug font-light whitespace-pre-line">
                    {
                      "D'autres cas d'usage à intégrer dans ce projet open source au service du Mouvement HLM ?\n\ncharnould@pierre-ia.org"
                    }
                  </span>
                </motion.div>
              )
            }

            const identity = PANEL_IDENTITY[action.tab!]!
            const Icon = identity.icon

            const isChat = action.tab === 'chat'

            return (
              <motion.button
                key={action.key}
                variants={tile}
                whileHover={{
                  scale: 1.03,
                  y: -6,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.07)',
                  transition: { type: 'spring', stiffness: 320, damping: 22 }
                }}
                whileTap={
                  isChat
                    ? {
                        scale: 0.94,
                        y: 2,
                        boxShadow: '0 4px 20px rgba(121,159,12,0.35)',
                        transition: { type: 'spring', stiffness: 480, damping: 26 }
                      }
                    : {
                        scale: 0.97,
                        y: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                        transition: { type: 'spring', stiffness: 400, damping: 28 }
                      }
                }
                onClick={() => onNavigate(action.tab!)}
                className="relative flex cursor-pointer flex-col items-start justify-between rounded-2xl p-5 text-left text-white"
                style={{ background: identity.gradient, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
              >
                <kbd className="absolute top-4 right-4 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/20 font-mono text-[13px] font-medium text-white/80 select-none">
                  {action.key}
                </kbd>
                <div className="opacity-90">
                  <Icon size={64} strokeWidth={1.2} />
                </div>
                <span className="font-inter mt-auto text-[25px]/[28px] font-medium text-balance">
                  {identity.label}
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  )
}

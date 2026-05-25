import {
  CheckCircle2,
  Clock,
  PauseCircle,
  Pencil,
  Plus,
  XCircle,
  type LucideIcon
} from 'lucide-react'
import { animate, LayoutGroup, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardFooter } from '@/shared/components/ui/card'
import { Spinner } from '@/shared/components/ui/spinner'
import type { UiSettings } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'

import { AUTOMATION_TYPE_LABELS, isTicketReplyAutomation } from '../lib/automation-types'
import { formatTicketFilters } from './automation-display'
import {
  AUTO_LIST_HOVER_TRANSITION,
  AUTO_LIST_INK_TRANSITION,
  AUTO_LIST_INK_VARIANTS,
  AUTO_LIST_META_VARIANTS,
  AUTO_LIST_SCROLL_TRANSITION,
  AUTO_LIST_SELECTION_SPRING
} from './automations-chrome'
import type { Automation, AutomationStatus } from './mock-data'

interface StatusDescriptor {
  label: string
  variant: 'success' | 'danger' | 'info' | 'warning' | 'neutral'
  icon: LucideIcon | null
}

function statusDescriptor(status: AutomationStatus): StatusDescriptor {
  switch (status) {
    case 'success':
      return { label: 'Succès', variant: 'success', icon: CheckCircle2 }
    case 'error':
      return { label: 'En échec', variant: 'danger', icon: XCircle }
    case 'running':
      return { label: 'En cours', variant: 'warning', icon: null }
    case 'scheduled':
      return { label: 'Planifiée', variant: 'info', icon: Clock }
    case 'paused':
      return { label: 'En pause', variant: 'neutral', icon: PauseCircle }
  }
}

export function StatusPill({ status }: { status: AutomationStatus }) {
  const { label, variant, icon: Icon } = statusDescriptor(status)
  return (
    <Badge variant={variant} size="compact">
      {status === 'running' ? (
        <Spinner className="size-2.5" />
      ) : (
        Icon && <Icon className="size-2.5" />
      )}
      {label}
    </Badge>
  )
}

function compactFrequency(automation: Automation): string {
  const time = automation.frequencyTime
  switch (automation.frequency) {
    case 'daily':
      return `Quotidien · ${time}`
    case 'weekly':
      return `${automation.frequencyDay ?? 'lundi'} · ${time}`
    case 'monthly':
      return automation.frequencyDay
        ? `${automation.frequencyDay} du mois · ${time}`
        : `Mensuel · ${time}`
  }
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

type PillAnchor = 'last' | 'next' | 'solo' | 'end'

function pillAnchor(status: AutomationStatus, hasNext: boolean): PillAnchor {
  switch (status) {
    case 'running':
      return 'solo'
    case 'success':
    case 'error':
      return 'last'
    case 'scheduled':
      return hasNext ? 'next' : 'end'
    case 'paused':
      return 'end'
  }
}

function GenerationMeta({ automation }: { automation: Automation }) {
  const status = automation.status
  const last = automation.lastRunDate ? formatShortDate(automation.lastRunDate) : 'jamais'
  const next = automation.nextRunDate ? formatShortDate(automation.nextRunDate) : null
  const anchor = pillAnchor(status, next !== null)
  const timeline = 'inline-flex items-center gap-1.5 text-muted-foreground tabular-nums'

  if (anchor === 'solo') {
    return <StatusPill status={status} />
  }

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className={timeline}>
        {last}
        {anchor === 'last' && <StatusPill status={status} />}
      </span>
      {next && (
        <>
          <span className="text-muted-foreground/35">→</span>
          <span className={timeline}>
            {next}
            {anchor === 'next' && <StatusPill status={status} />}
          </span>
        </>
      )}
      {anchor === 'end' && <StatusPill status={status} />}
    </span>
  )
}

function accessText(automation: Automation): string {
  const count = automation.collaborators.length
  if (count === 0) return automation.owner
  const label = count === 1 ? 'personne' : 'personnes'
  return `${automation.owner} + ${count} ${label}`
}

function scrollListItemIntoView(item: HTMLElement, reduceMotion: boolean | null) {
  const scrollEl = item.closest('.automations-list-scroll') as HTMLElement | null
  if (!scrollEl) return

  const itemTop = item.offsetTop
  const itemBottom = itemTop + item.offsetHeight
  const viewTop = scrollEl.scrollTop
  const viewBottom = viewTop + scrollEl.clientHeight

  if (itemTop >= viewTop && itemBottom <= viewBottom) return

  let target = scrollEl.scrollTop
  if (itemTop < viewTop) target = itemTop
  else if (itemBottom > viewBottom) target = itemBottom - scrollEl.clientHeight

  if (reduceMotion) {
    scrollEl.scrollTop = target
    return
  }

  void animate(scrollEl, { scrollTop: target }, AUTO_LIST_SCROLL_TRANSITION)
}

interface AutomationListItemProps {
  automation: Automation
  isSelected: boolean
  uiSettings?: UiSettings
  onSelectAutomation: (automation: Automation) => void
  onEdit: (automation: Automation) => void
}

export function AutomationListItem({
  automation,
  isSelected,
  uiSettings,
  onSelectAutomation,
  onEdit
}: AutomationListItemProps) {
  const itemRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  const inkState = isSelected ? 'selected' : 'idle'
  const inkTransition = reduceMotion ? { duration: 0 } : AUTO_LIST_INK_TRANSITION
  const hoverTransition = reduceMotion ? { duration: 0 } : AUTO_LIST_HOVER_TRANSITION
  const selectionTransition = reduceMotion ? { duration: 0 } : AUTO_LIST_SELECTION_SPRING

  useEffect(() => {
    if (!isSelected || !itemRef.current) return
    scrollListItemIntoView(itemRef.current, reduceMotion)
  }, [isSelected, reduceMotion])

  return (
    <motion.article
      ref={itemRef}
      layout="position"
      className={cn(
        'automations-list-row group',
        isSelected && 'automations-list-row--selected z-[1]'
      )}
      initial={false}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation()
        onSelectAutomation(automation)
      }}
    >
      <motion.div
        aria-hidden
        className="automations-list-item__hover"
        initial={false}
        animate={{ opacity: hovered && !isSelected ? 1 : 0 }}
        transition={hoverTransition}
      />
      {isSelected ? (
        <motion.div
          layoutId="automation-selection"
          className="automations-list-item__selection"
          initial={false}
          transition={selectionTransition}
        />
      ) : null}

      <div className="automations-list-row__inner">
        <div className="automations-list-row__head">
          <motion.h3
            layout="position"
            className={cn(
              'automations-list-row__title',
              isSelected ? 'text-desk-title' : 'text-desk-label'
            )}
            variants={AUTO_LIST_INK_VARIANTS}
            initial={false}
            animate={inkState}
            transition={inkTransition}
          >
            {automation.name}
          </motion.h3>
          <Badge variant="neutral" size="compact" className="shrink-0">
            {AUTOMATION_TYPE_LABELS[automation.type]}
          </Badge>
          {automation.isCreator ? (
            <motion.div
              initial={false}
              animate={{ opacity: isSelected || hovered ? 1 : 0 }}
              transition={hoverTransition}
              className="shrink-0"
            >
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground/50 hover:text-muted-foreground! size-5"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(automation)
                }}
              >
                <Pencil />
              </Button>
            </motion.div>
          ) : null}
        </div>

        {automation.description ? (
          <motion.p
            layout="position"
            className="automations-list-item__desc text-balance"
            variants={AUTO_LIST_INK_VARIANTS}
            initial={false}
            animate={inkState}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { ...AUTO_LIST_INK_TRANSITION, delay: isSelected ? 0.02 : 0 }
            }
          >
            {automation.description}
          </motion.p>
        ) : null}

        {isTicketReplyAutomation(automation) && automation.ticketFilters.rules.length > 0 ? (
          <motion.p
            layout="position"
            className="text-muted-foreground text-[10px] leading-snug text-balance"
            variants={AUTO_LIST_INK_VARIANTS}
            initial={false}
            animate={inkState}
            transition={inkTransition}
          >
            {formatTicketFilters(automation.ticketFilters, uiSettings)}
          </motion.p>
        ) : null}

        <motion.dl
          className="automations-list-item__meta grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-0.5 text-[10px] leading-tight"
          variants={AUTO_LIST_META_VARIANTS}
          initial={false}
          animate={inkState}
          transition={inkTransition}
        >
          <dt className="font-medium">Génération</dt>
          <dd className="min-w-0">
            <GenerationMeta automation={automation} />
          </dd>
          <dt className="font-medium">Fréquence</dt>
          <dd className="min-w-0">{compactFrequency(automation)}</dd>
          <dt className="font-medium">Accès</dt>
          <dd className="min-w-0">{accessText(automation)}</dd>
        </motion.dl>
      </div>
    </motion.article>
  )
}

interface AutomationsListProps {
  automations: Automation[]
  selectedAutomationId: string | null
  uiSettings?: UiSettings
  onSelectAutomation: (automation: Automation) => void
  onClearSelection: () => void
  onEdit: (automation: Automation) => void
  onNewAutomation: () => void
}

export function AutomationsList({
  automations,
  selectedAutomationId,
  uiSettings,
  onSelectAutomation,
  onClearSelection,
  onEdit,
  onNewAutomation
}: AutomationsListProps) {
  const reduceMotion = useReducedMotion()

  return (
    <MotionConfig
      reducedMotion={reduceMotion ? 'always' : 'never'}
      transition={AUTO_LIST_SELECTION_SPRING}
    >
      <Card variant="chrome">
        <div
          className="automations-list-scroll desk-pane-scroll min-h-0 flex-1"
          onClick={onClearSelection}
        >
          <LayoutGroup id="automation-list-selection">
            {automations.map((automation) => (
              <AutomationListItem
                key={automation.id}
                automation={automation}
                isSelected={selectedAutomationId === automation.id}
                uiSettings={uiSettings}
                onSelectAutomation={onSelectAutomation}
                onEdit={onEdit}
              />
            ))}
          </LayoutGroup>
        </div>
        <CardFooter inset="chrome">
          <Button type="button" variant="chrome" size="desk" onClick={onNewAutomation}>
            <Plus />
            Nouvelle automatisation
          </Button>
        </CardFooter>
      </Card>
    </MotionConfig>
  )
}

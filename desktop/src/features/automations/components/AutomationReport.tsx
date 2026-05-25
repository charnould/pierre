import { Bug, ChevronRight, FileText, Mail } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'

import {
  isReportAutomation,
  isTicketReplyAutomation,
  type ReportRun,
  type TicketReplyOutcome,
  type TicketReplyRun
} from '@/features/automations/lib/automation-types'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardBody } from '@/shared/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { cn } from '@/shared/lib/utils'

import { runDisplayStatus } from './automation-display'
import { AUTO_REPORT_TRANSITION } from './automations-chrome'
import { StatusPill } from './AutomationsList'
import { MarkdownReport } from './MarkdownReport'
import { formatAbsoluteDate, type Automation, type AutomationStatus } from './mock-data'

interface AutomationReportProps {
  automation: Automation
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function outcomeLabel(outcome: TicketReplyOutcome): string {
  switch (outcome) {
    case 'generated':
      return 'Généré'
    case 'skipped_existing_draft':
      return 'Ignoré (brouillon)'
    case 'error':
      return 'Erreur'
  }
}

function outcomeVariant(outcome: TicketReplyOutcome): 'success' | 'neutral' | 'danger' {
  switch (outcome) {
    case 'generated':
      return 'success'
    case 'skipped_existing_draft':
      return 'neutral'
    case 'error':
      return 'danger'
  }
}

function ReportRunItem({
  run,
  automationName,
  status,
  defaultOpen = false
}: {
  run: ReportRun
  automationName: string
  status: AutomationStatus
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className={cn('auto-report-page', open && 'auto-report-page--open')}>
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        data-open={open || undefined}
        className="auto-report-page-header"
        onClick={() => setOpen((value) => !value)}
      >
        <motion.span
          aria-hidden
          className="auto-report-page-header-chevron"
          initial={false}
          animate={{ rotate: open ? 90 : 0 }}
          transition={AUTO_REPORT_TRANSITION}
        >
          <ChevronRight className="text-muted-foreground/55 size-3.5 shrink-0" />
        </motion.span>
        <span className="auto-report-page-header-title truncate">{automationName}</span>
        <span className="auto-report-page-header-meta">
          <span className="auto-report-page-header-date text-muted-foreground shrink-0 first-letter:uppercase">
            {formatFullDate(run.date)}
          </span>
          <StatusPill status={status} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={`${panelId}-trigger`}
            className="auto-report-page-expand"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={AUTO_REPORT_TRANSITION}
          >
            <div className="auto-report-page-body">
              <MarkdownReport content={run.report} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function TicketReplyRunItem({
  run,
  automationName,
  status,
  defaultOpen = false
}: {
  run: TicketReplyRun
  automationName: string
  status: AutomationStatus
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const { summary } = run

  return (
    <div className={cn('auto-report-page', open && 'auto-report-page--open')}>
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        data-open={open || undefined}
        className="auto-report-page-header"
        onClick={() => setOpen((value) => !value)}
      >
        <motion.span
          aria-hidden
          className="auto-report-page-header-chevron"
          initial={false}
          animate={{ rotate: open ? 90 : 0 }}
          transition={AUTO_REPORT_TRANSITION}
        >
          <ChevronRight className="text-muted-foreground/55 size-3.5 shrink-0" />
        </motion.span>
        <span className="auto-report-page-header-title truncate">{automationName}</span>
        <span className="auto-report-page-header-meta">
          <span className="text-muted-foreground hidden shrink-0 text-[10px] sm:inline">
            {summary.generated} générée{summary.generated > 1 ? 's' : ''} · {summary.skipped}{' '}
            ignorée{summary.skipped > 1 ? 's' : ''}
            {summary.errors > 0
              ? ` · ${summary.errors} erreur${summary.errors > 1 ? 's' : ''}`
              : ''}
          </span>
          <span className="auto-report-page-header-date text-muted-foreground shrink-0 first-letter:uppercase">
            {formatFullDate(run.date)}
          </span>
          <StatusPill status={status} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={`${panelId}-trigger`}
            className="auto-report-page-expand"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={AUTO_REPORT_TRANSITION}
          >
            <div className="auto-report-page-body px-3 py-2">
              <ul className="space-y-1.5">
                {run.tickets.map((ticket) => (
                  <li
                    key={ticket.id_reclamation}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-mono tabular-nums">{ticket.id_reclamation}</span>
                    <Badge variant={outcomeVariant(ticket.outcome)} size="compact">
                      {outcomeLabel(ticket.outcome)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function AutomationRunsList({ automation }: { automation: Automation }) {
  const runs = automation.runs

  return (
    <div className="auto-report-stack">
      {isReportAutomation(automation)
        ? (runs as ReportRun[]).map((run, index) => (
            <ReportRunItem
              key={run.id}
              run={run}
              automationName={automation.name}
              status={runDisplayStatus(automation, index === 0)}
              defaultOpen={index === 0}
            />
          ))
        : (runs as TicketReplyRun[]).map((run, index) => (
            <TicketReplyRunItem
              key={run.id}
              run={run}
              automationName={automation.name}
              status={runDisplayStatus(automation, index === 0)}
              defaultOpen={index === 0}
            />
          ))}
    </div>
  )
}

export function AutomationReport({ automation }: AutomationReportProps) {
  const runs = automation.runs
  const latest = runs[0]
  const isReply = isTicketReplyAutomation(automation)

  if (automation.status === 'error' && latest) {
    const previousRuns = runs.slice(1)
    return (
      <div className="desk-output-panel">
        <Card variant="report" className="flex min-h-0 flex-1 flex-col">
          <CardBody inset="report" className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <Empty className="desk-output-empty min-h-0 flex-1 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-danger-soft text-danger-soft-foreground">
                  <Bug />
                </EmptyMedia>
                <EmptyTitle>La dernière exécution a échoué</EmptyTitle>
                <EmptyDescription>
                  La dernière exécution n'a pas pu aboutir.
                  {automation.nextRunDate
                    ? ` Une nouvelle tentative est prévue le ${formatAbsoluteDate(automation.nextRunDate)}.`
                    : " Relancez l'automatisation manuellement depuis le formulaire d'édition."}{' '}
                  En cas d'échec récurrent, contactez le support.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
            {previousRuns.length > 0 ? (
              <div className="automations-report-error-strip max-h-[40%] shrink-0 overflow-y-auto">
                <div className="desk-auto-runs-scroll">
                  <AutomationRunsList automation={{ ...automation, runs: previousRuns }} />
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="desk-output-panel">
        <Card variant="report">
          <CardBody inset="report">
            <Empty className="desk-output-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">{isReply ? <Mail /> : <FileText />}</EmptyMedia>
                <EmptyTitle>Aucune exécution pour le moment</EmptyTitle>
                <EmptyDescription>
                  {automation.status === 'scheduled'
                    ? isReply
                      ? 'La première exécution traitera les réclamations éligibles à la prochaine échéance planifiée.'
                      : 'La première génération sera produite à la prochaine échéance planifiée.'
                    : automation.status === 'paused'
                      ? 'Cette automatisation est en pause. Son propriétaire doit la réactiver.'
                      : isReply
                        ? "L'historique des réponses apparaîtra ici dès la première exécution."
                        : 'Le rapport apparaîtra ici dès la première génération.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="desk-output-panel">
      <Card variant="report" className="flex min-h-0 flex-1 flex-col">
        <CardBody inset="report" className="desk-auto-runs-scroll min-h-0 flex-1 p-0">
          <AutomationRunsList automation={automation} />
        </CardBody>
      </Card>
    </div>
  )
}

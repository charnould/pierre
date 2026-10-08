import { ArrowLeft, CircleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/shared/components/ui/chart'
import { CodeBlock, CodeBlockContent } from '@/shared/components/ui/code-block'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { FieldDescription } from '@/shared/components/ui/field'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import {
  LLM_OPERATION_LABELS,
  LLM_RUN_STATUS_LABELS,
  type LlmRun,
  type LlmRunSummary,
  type LlmUsageSummary,
  USAGE_PERIOD_LABELS,
  USAGE_PERIODS,
  type UsagePeriod
} from '@/shared/types/admin-insights'

const chartConfig = {
  tokens: { label: 'Jetons', color: 'var(--foreground)' }
} satisfies ChartConfig

const periods: SelectOption[] = USAGE_PERIODS.map((period) => ({
  value: period,
  label: USAGE_PERIOD_LABELS[period]
}))

const tokens = new Intl.NumberFormat('fr-FR')
const dollars = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 4
})

function formatTokens(value: number | null) {
  return value == null ? 'Non mesuré' : tokens.format(value)
}

function observedFrom(value: string | null) {
  if (!value) return 'Non mesuré'
  return `Estimation basée sur les données enregistrées depuis le ${formatInspectorTimelineDateline(value).split(' · ')[0]}.`
}

const compactionReason = {
  manual: 'demandé',
  threshold: 'contexte rempli',
  overflow: 'dépassement',
  unknown: 'inconnu'
} as const

const compactionStatus = {
  success: 'réussi',
  error: 'échoué',
  aborted: 'interrompu'
} as const

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

function literal(value: unknown) {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2) ?? ''
}

export function LlmStatisticsPanel({ url, onBack }: { url: string; onBack: () => void }) {
  const reduced = useReducedMotion()
  const [period, setPeriod] = useState<UsagePeriod>('30d')
  const [usage, setUsage] = useState<LlmUsageSummary | null>(null)
  const [runs, setRuns] = useState<LlmRunSummary[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<LlmRun | null>(null)
  const [loadingRun, setLoadingRun] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    void Promise.all([
      window.api?.getAdminLlmUsage({ url, period }),
      window.api?.getAdminLlmRuns({ url, period, offset: 0 })
    ]).then(([usageResponse, runsResponse]) => {
      if (!active) return
      if (!usageResponse || 'error' in usageResponse || !runsResponse || 'error' in runsResponse) {
        setError(
          (usageResponse && 'error' in usageResponse && usageResponse.error.message) ||
            (runsResponse && 'error' in runsResponse && runsResponse.error.message) ||
            'Impossible de joindre le serveur.'
        )
        return
      }
      setError('')
      setUsage(usageResponse.data)
      setTotal(runsResponse.data.total)
      setRuns(runsResponse.data.runs)
    })
    return () => {
      active = false
    }
  }, [period, reload, url])

  async function openRun(id: string) {
    setLoadingRun(true)
    const response = await window.api?.getAdminLlmRun({ url, id })
    setLoadingRun(false)
    if (!response || 'error' in response) return
    setSelected(response.data)
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Retour"
            onClick={onBack}
          >
            <ArrowLeft />
          </Button>
          <h1 className="font-serif text-4xl leading-tight font-normal">Statistiques</h1>
        </div>
        {error ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert />
              </EmptyMedia>
              <EmptyTitle>Statistiques indisponibles</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReload((current) => current + 1)}
              >
                Réessayer
              </Button>
            </EmptyContent>
          </Empty>
        ) : !usage || !runs ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Consommation</CardTitle>
                <CardAction>
                  <Select
                    value={period}
                    items={periods}
                    onValueChange={(value) => setPeriod(value as UsagePeriod)}
                  >
                    <SelectTrigger size="sm" aria-label="Période">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItems items={periods} />
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <FieldDescription>
                    Un jeton est l’unité de consommation du modèle de langage.
                  </FieldDescription>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-muted-foreground text-xs">Jetons consommés ce mois</div>
                      <div className="text-xl font-medium tabular-nums">
                        {formatTokens(usage.monthTokens)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Estimation fin du mois</div>
                      <div className="text-xl font-medium tabular-nums">
                        {formatTokens(usage.monthProjection)}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {observedFrom(usage.monthObservedFrom)}
                      </p>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Estimation fin de l’année</div>
                      <div className="text-xl font-medium tabular-nums">
                        {formatTokens(usage.yearProjection)}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {observedFrom(usage.yearObservedFrom)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Consommation quotidienne</h3>
                    <ChartContainer config={chartConfig} className="h-48 w-full">
                      <AreaChart accessibilityLayer data={usage.daily}>
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value: string) => value.slice(8)}
                        />
                        <YAxis tickLine={false} axisLine={false} width={48} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          dataKey="tokens"
                          stroke="var(--foreground)"
                          fill="var(--foreground)"
                          fillOpacity={0.12}
                          isAnimationActive={!reduced}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Consommation par usage</h3>
                    <ChartContainer config={chartConfig} className="h-48 w-full">
                      <BarChart
                        accessibilityLayer
                        data={usage.byOperation.map((item) => ({
                          usage: LLM_OPERATION_LABELS[item.operation],
                          tokens: item.tokens
                        }))}
                      >
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="usage" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} width={48} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="tokens"
                          fill="var(--foreground)"
                          isAnimationActive={!reduced}
                        />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Journal des traitements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <FieldDescription>
                    Chaque ligne est un appel au modèle : une conversation, une synthèse ou un
                    rapport.
                  </FieldDescription>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Modèle</TableHead>
                        <TableHead>Niveau de réflexion</TableHead>
                        <TableHead>État</TableHead>
                        <TableHead>Jetons</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Détail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>
                            <span className="tabular-nums">
                              {formatInspectorTimelineDateline(run.startedAt)}
                            </span>
                          </TableCell>
                          <TableCell>{LLM_OPERATION_LABELS[run.operation]}</TableCell>
                          <TableCell>{run.model}</TableCell>
                          <TableCell>{run.reasoningEffort}</TableCell>
                          <TableCell>{LLM_RUN_STATUS_LABELS[run.status]}</TableCell>
                          <TableCell>
                            <span className="tabular-nums">{formatTokens(run.tokensTotal)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="tabular-nums">{run.toolCount}</span>
                          </TableCell>
                          <TableCell>
                            <span className="tabular-nums">{tokens.format(run.durationMs)} ms</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={loadingRun}
                              onClick={() => void openRun(run.id)}
                            >
                              Consulter
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {runs.length < total ? (
                    <div className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void window.api
                            ?.getAdminLlmRuns({ url, period, offset: runs.length })
                            .then((response) => {
                              if (!response || 'error' in response) return
                              setTotal(response.data.total)
                              setRuns((current) => [...(current ?? []), ...response.data.runs])
                            })
                        }}
                      >
                        Afficher la suite
                      </Button>
                    </div>
                  ) : null}
                  {runs.length === 0 ? (
                    <p className="text-muted-foreground pt-4 text-sm">
                      Aucun traitement sur cette période.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl" viewport="form">
          <DialogHeader>
            <DialogTitle>Traitement</DialogTitle>
            <DialogDescription>
              {selected
                ? `${LLM_OPERATION_LABELS[selected.operation]} · ${selected.model} · ${LLM_RUN_STATUS_LABELS[selected.status]}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="flex flex-col gap-4 overflow-auto">
              <div className="flex flex-col gap-2 text-sm">
                {(
                  [
                    ['Date', formatInspectorTimelineDateline(selected.startedAt)],
                    ['Modèle effectif', selected.details.model],
                    ['Modèle demandé', selected.details.requestedModel ?? selected.details.model],
                    ['Niveau de réflexion', selected.reasoningEffort],
                    ['Jetons', formatTokens(selected.tokensTotal)],
                    ['Durée', `${tokens.format(selected.durationMs)} ms`],
                    [
                      'Contexte',
                      selected.details.contextUsage
                        ? `${selected.details.contextUsage.percent ?? '?'} % · ${formatTokens(selected.details.contextUsage.tokens)} / ${formatTokens(selected.details.contextUsage.contextWindow)}`
                        : 'Non mesuré'
                    ],
                    ['Retries', String(selected.details.retryCount ?? 0)],
                    ['Compactages', String(selected.details.compactions?.length ?? 0)],
                    [
                      'Coût estimé',
                      selected.details.cost == null
                        ? 'Non mesuré'
                        : dollars.format(selected.details.cost)
                    ],
                    [
                      'Coût fournisseur',
                      selected.details.providerCost == null
                        ? 'Non communiqué'
                        : dollars.format(selected.details.providerCost)
                    ]
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <div className="text-muted-foreground w-40">{label}</div>
                    <div className="tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
              {(selected.details.retryCount ?? 0) > 0 ||
              (selected.details.compactions?.length ?? 0) > 0 ? (
                <Collapsible>
                  <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                    Récupérations automatiques
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-col gap-2 pt-2 text-sm">
                      <p>
                        {selected.details.retryCount ?? 0}{' '}
                        {(selected.details.retryCount ?? 0) > 1 ? 'reprises' : 'reprise'}{' '}
                        fournisseur
                      </p>
                      {selected.details.compactions?.map((compaction, index) => (
                        <p key={`${compaction.reason}-${index}`}>
                          Compactage {compactionReason[compaction.reason]} ·{' '}
                          {compactionStatus[compaction.status]}
                          {compaction.tokensBefore != null
                            ? ` · ${formatTokens(compaction.tokensBefore)} → ${formatTokens(compaction.estimatedTokensAfter)} jetons`
                            : ''}
                        </p>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
              <Collapsible>
                <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                  Raisonnement du modèle
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="pt-2 text-sm leading-5 whitespace-pre-wrap">
                    {selected.details.reasoning || 'Aucun raisonnement enregistré.'}
                  </p>
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                  Actions de l’assistant
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-4 pt-2">
                    {selected.details.tools.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Aucune action.</p>
                    ) : (
                      selected.details.tools.map((tool, index) => (
                        <div key={`${tool.name}-${index}`} className="flex flex-col gap-2">
                          <div className="text-sm">
                            {tool.name} · {tokens.format(tool.durationMs)} ms ·{' '}
                            {tool.status === 'ok' ? 'Réussi' : 'Échec'}
                          </div>
                          <CodeBlock size="sm">
                            <CodeBlockContent>{literal(tool.args)}</CodeBlockContent>
                          </CodeBlock>
                          <CodeBlock size="sm">
                            <CodeBlockContent>{literal(tool.result)}</CodeBlockContent>
                          </CodeBlock>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

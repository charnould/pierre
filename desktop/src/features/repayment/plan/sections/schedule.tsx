import { cn } from 'cn'
import { useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FieldDescription } from '@/shared/components/ui/field'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card'
import { Switch } from '@/shared/components/ui/switch'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import { repaymentSetup } from '@/shared/lib/instance-customization'

import { MAX_SCHEDULE_MONTHS } from '../../../../../../shared/repayment-plan'
import type { CaseFile } from '../document'
import { AddButton, DateField, Euros, RemoveButton, Section } from '../form'
import { installmentFigures, loanNetAlert } from '../schedule-metrics'

const BLANK = { date_echeance: null, mensualite_euros: null }
const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

function money(value: number | null): string | null {
  return value == null ? null : euro.format(value)
}

function percent(value: number | null): string | null {
  if (value == null) return null
  const label = (value * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${label} %`
}

function unitsLabel(value: number | null): string | null {
  if (value == null) return null
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

function limitLabel(value: number, suffix: string): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${suffix}`
}

export function Schedule({
  foyer,
  budget,
  value,
  onChange
}: {
  foyer: CaseFile['foyer']
  budget: CaseFile['budget']
  value: CaseFile['echeancier']
  onChange: (value: CaseFile['echeancier']) => void
}) {
  const schedule = repaymentSetup().create_plan.schedule
  const [pending, setPending] = useState<(typeof schedule.thresholds)[number] | null>(null)
  const effortLimit = limitLabel(schedule.maxEffortRate, '%')
  const remainderLimit = limitLabel(schedule.minDailyRemainder, 'euros')

  const add = () => {
    if (value.echeances.length >= MAX_SCHEDULE_MONTHS) return
    const threshold = schedule.thresholds.find((item) => item.months === value.echeances.length)
    if (threshold) {
      setPending(threshold)
      return
    }
    onChange({ ...value, echeances: [...value.echeances, { ...BLANK }] })
  }

  return (
    <Section
      id="echeancier"
      title="Proposition d'échéancier"
      action={
        <Switch
          id="echeancier_propose"
          checked={value.propose}
          aria-labelledby="echeancier"
          onCheckedChange={(propose) => onChange({ ...value, propose: propose === true })}
        />
      }
    >
      {value.propose ? (
        <div className="flex flex-col gap-4">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-8" />
              <col className="w-32" />
              <col className="w-28" />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col className="w-10" />
            </colgroup>
            <TableCaption className="sr-only">Échéancier</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Mensualité</TableHead>
                <TableHead>Ressources</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>
                  <ColumnFormula
                    name="UC"
                    definition="Unités de consommation INSEE à la date de l’échéance : 1 pour le premier adulte, 0,5 pour les autres personnes de 14 ans ou plus, 0,3 pour les enfants de moins de 14 ans. Un enfant pas encore né ne compte pas."
                  />
                </TableHead>
                <TableHead>
                  <ColumnFormula
                    name="TE·LN"
                    definition="Taux d’effort en regard du loyer net"
                    formula={{
                      numerator: 'loyer + charges + mensualité − aides au logement',
                      denominator: 'ressources totales',
                      operator: '<',
                      limit: effortLimit
                    }}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFormula
                    name="RAV·LN"
                    definition="Reste-à-vivre en regard du loyer net"
                    formula={{
                      numerator:
                        'ressources totales − (loyer + charges + mensualité − aides au logement)',
                      denominator: 'unités de consommation × 30 jours',
                      operator: '>',
                      limit: remainderLimit
                    }}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFormula
                    name="TE·G"
                    definition="Taux d’effort intégrant l'ensemble des ressources et charges déclarées."
                    formula={{
                      numerator: 'total des charges + mensualité',
                      denominator: 'total des ressources'
                    }}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFormula
                    name="RAV·G"
                    definition="Reste-à-vivre intégrant l’ensemble des charges déclarées."
                    formula={{
                      numerator: 'total des ressources − total des charges − mensualité',
                      denominator: 'unités de consommation × 30 jours'
                    }}
                  />
                </TableHead>
                <TableHead>
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.echeances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    <span className="text-muted-foreground">Aucune échéance proposée.</span>
                  </TableCell>
                </TableRow>
              ) : (
                value.echeances.map((installment, index) => {
                  const figures = installmentFigures(foyer, budget, installment)
                  const alert = loanNetAlert(
                    figures.teLn,
                    figures.ravLn,
                    schedule.maxEffortRate,
                    schedule.minDailyRemainder
                  )
                  const cells = [
                    { text: money(figures.resources) },
                    { text: money(figures.charges) },
                    { text: unitsLabel(figures.units) },
                    { text: percent(figures.teLn), alert },
                    { text: money(figures.ravLn), alert },
                    { text: percent(figures.teG) },
                    { text: money(figures.ravG) }
                  ]
                  return (
                    <TableRow key={`installment-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="min-w-0">
                        <DateField
                          value={installment.date_echeance}
                          onChange={(date_echeance) =>
                            onChange({
                              ...value,
                              echeances: value.echeances.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, date_echeance } : item
                              )
                            })
                          }
                          label={`Date de l’échéance ${index + 1}`}
                        />
                      </TableCell>
                      <TableCell className="min-w-0">
                        <Euros
                          id={`echeance_${index}_mensualite_euros`}
                          label={`Mensualité ${index + 1}`}
                          value={installment.mensualite_euros}
                          onChange={(mensualite_euros) =>
                            onChange({
                              ...value,
                              echeances: value.echeances.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, mensualite_euros } : item
                              )
                            })
                          }
                        />
                      </TableCell>
                      {cells.map((cell, metricIndex) => (
                        <TableCell key={metricIndex}>
                          <Cell text={cell.text} alert={cell.alert === true} />
                        </TableCell>
                      ))}
                      <TableCell>
                        <RemoveButton
                          label={`Retirer l’échéance ${index + 1}`}
                          onClick={() =>
                            onChange({
                              ...value,
                              echeances: value.echeances.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <AddButton
            className="ms-2"
            disabled={value.echeances.length >= MAX_SCHEDULE_MONTHS}
            onClick={add}
          >
            Ajouter une échéance
          </AddButton>
          <ConfirmDialog
            open={pending != null}
            title={pending ? `Plus de ${pending.months} mensualités !` : ''}
            description={pending?.message ?? ''}
            confirmLabel="J’ai compris"
            onConfirm={() => {
              setPending(null)
              onChange({ ...value, echeances: [...value.echeances, { ...BLANK }] })
            }}
            onCancel={() => setPending(null)}
          />
        </div>
      ) : null}
    </Section>
  )
}

function Cell({ text, alert }: { text: string | null; alert: boolean }) {
  if (text == null) return <span className="text-muted-foreground">—</span>
  return <span className={cn('tabular-nums', alert && 'text-destructive')}>{text}</span>
}

function ColumnFormula({
  name,
  definition,
  formula
}: {
  name: string
  definition: string
  formula?: {
    numerator: string
    denominator: string
    operator?: '>' | '<'
    limit?: string
  }
}) {
  const text = (
    <div className="flex flex-col gap-0.5">
      <h4 className="font-semibold">{name}</h4>
      <FieldDescription>{definition}</FieldDescription>
    </div>
  )

  return (
    <HoverCard>
      <HoverCardTrigger render={<button type="button" />}>{name}</HoverCardTrigger>
      <HoverCardContent className={cn(formula && 'w-fit min-w-64')}>
        {formula ? (
          <div className="flex flex-col gap-4">
            {text}
            <math display="block" className="font-math mx-auto w-fit">
              <mrow>
                <mfrac>
                  <mtext>{formula.numerator}</mtext>
                  <mtext>{formula.denominator}</mtext>
                </mfrac>
                {formula.operator && formula.limit ? (
                  <>
                    <mo>{formula.operator}</mo>
                    <mtext>{formula.limit}</mtext>
                  </>
                ) : null}
              </mrow>
            </math>
          </div>
        ) : (
          text
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

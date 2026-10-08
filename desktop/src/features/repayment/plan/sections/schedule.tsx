import { cn } from 'cn'
import { type ReactNode, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FieldDescription } from '@/shared/components/ui/field'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card'
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

import {
  blankInstallment,
  CONTESTED_TREATMENTS,
  MAX_SCHEDULE_MONTHS,
  type Schedule as ScheduleValue,
  scheduleGap
} from '../../../../../../shared/repayment-plan'
import {
  AddButton,
  CodeSelect,
  DateField,
  Euros,
  RemoveButton,
  Row,
  Rows,
  Section,
  YesNo
} from '../form'
import { loanNetAlert } from '../schedule-metrics'

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
  id,
  title,
  value,
  onChange,
  action
}: {
  id: string
  title: string
  value: ScheduleValue
  onChange: (value: ScheduleValue) => void
  action?: ReactNode
}) {
  const schedule = repaymentSetup().schedule
  const [pending, setPending] = useState<{ installments: number; message: string } | null>(null)
  const effortLimit = limitLabel(schedule.maxEffortPercent, '%')
  const remainderLimit = limitLabel(schedule.minDailyRemainderEuros, 'euros')
  const gap = scheduleGap(value)

  const add = () => {
    if (value.echeances.length >= MAX_SCHEDULE_MONTHS) return
    const message = schedule.confirmAfterInstallments[String(value.echeances.length)]
    if (message) {
      setPending({ installments: value.echeances.length, message })
      return
    }
    onChange({ ...value, echeances: [...value.echeances, blankInstallment()] })
  }

  return (
    <Section id={id} title={title} action={action}>
      <Rows>
        <Row
          title="Montant contesté"
          description="Indiquez s’il entre dans le montant à apurer."
          htmlFor={`${id}_contestation`}
        >
          <CodeSelect
            id={`${id}_contestation`}
            label="Traitement du montant contesté"
            value={value.traitement_montant_conteste}
            options={CONTESTED_TREATMENTS}
            onValueChange={(traitement_montant_conteste) => {
              if (traitement_montant_conteste) onChange({ ...value, traitement_montant_conteste })
            }}
          />
        </Row>
        <YesNo
          id={`${id}_ancienne_dette`}
          title="Ancienne dette locative"
          description="Ajouter l’ancienne dette hors solde au montant à apurer."
          checked={value.inclure_ancienne_dette_locative}
          onCheckedChange={(inclure_ancienne_dette_locative) =>
            onChange({ ...value, inclure_ancienne_dette_locative })
          }
        />
        <Row
          title="Montant à apurer"
          description="Partie débitrice du solde, après le traitement de la contestation et de l’ancienne dette."
        >
          <span className="tabular-nums">{money(value.montant_a_apurer_en_euros) ?? '—'}</span>
        </Row>
      </Rows>
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
                  definition="Unités de consommation à la date de l’échéance : 1 pour le premier adulte qui vit dans le logement, 0,5 à partir de 14 ans, 0,3 en dessous. Seuls les résidents permanents et alternés comptent."
                />
              </TableHead>
              <TableHead>
                <ColumnFormula
                  name="TE·LN"
                  definition="Taux d’effort sur le coût net du logement"
                  formula={{
                    numerator: 'coût net du logement + mensualité',
                    denominator: 'ressources totales',
                    operator: '<',
                    limit: effortLimit
                  }}
                />
              </TableHead>
              <TableHead>
                <ColumnFormula
                  name="RAV·LN"
                  definition="Reste à vivre après le coût net du logement"
                  formula={{
                    numerator: 'ressources − coût net du logement − mensualité',
                    denominator: 'unités de consommation × 30 jours',
                    operator: '>',
                    limit: remainderLimit
                  }}
                />
              </TableHead>
              <TableHead>
                <ColumnFormula
                  name="TE·G"
                  definition="Taux d’effort sur l’ensemble des charges."
                  formula={{
                    numerator: 'total des charges + mensualité',
                    denominator: 'total des ressources'
                  }}
                />
              </TableHead>
              <TableHead>
                <ColumnFormula
                  name="RAV·G"
                  definition="Reste à vivre après l’ensemble des charges."
                  formula={{
                    numerator: 'ressources − charges − mensualité',
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
                  <span className="text-muted-foreground">Aucune échéance.</span>
                </TableCell>
              </TableRow>
            ) : (
              value.echeances.map((installment, index) => {
                const alert = loanNetAlert(
                  installment.taux_effort_loyer_net,
                  installment.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros,
                  schedule.maxEffortPercent,
                  schedule.minDailyRemainderEuros
                )
                const cells = [
                  { text: money(installment.ressources_totales_du_mois_en_euros) },
                  { text: money(installment.charges_totales_du_mois_en_euros) },
                  { text: unitsLabel(installment.unites_de_consommation) },
                  { text: percent(installment.taux_effort_loyer_net), alert },
                  {
                    text: money(
                      installment.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros
                    ),
                    alert
                  },
                  { text: percent(installment.taux_effort_global) },
                  {
                    text: money(
                      installment.reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros
                    )
                  }
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
                        id={`${id}_${index}_montant`}
                        label={`Mensualité ${index + 1}`}
                        value={installment.montant_en_euros}
                        onChange={(montant_en_euros) =>
                          onChange({
                            ...value,
                            echeances: value.echeances.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, montant_en_euros } : item
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
                            echeances: value.echeances.filter((_, itemIndex) => itemIndex !== index)
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
        {gap != null && gap !== 0 ? (
          <FieldDescription>
            Écart avec le montant à apurer : {euro.format(Math.abs(gap))}{' '}
            {gap > 0 ? 'restent à répartir' : 'sont répartis en trop'}.
          </FieldDescription>
        ) : null}
        <ConfirmDialog
          open={pending != null}
          title={pending ? `Plus de ${pending.installments} mensualités !` : ''}
          description={pending?.message ?? ''}
          confirmLabel="J’ai compris"
          onConfirm={() => {
            setPending(null)
            onChange({ ...value, echeances: [...value.echeances, blankInstallment()] })
          }}
          onCancel={() => setPending(null)}
        />
      </div>
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

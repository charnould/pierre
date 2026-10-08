import {
  blankInstallment,
  MAX_SCHEDULE_MONTHS,
  type Schedule as ScheduleValue,
  SCHEDULE_ASSESSMENTS,
  type ScheduleAssessment,
  scheduleGap
} from '@pierre/shared/repayment-case-file'
import { cn } from 'cn'
import { useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FieldContent, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card'
import { Input } from '@/shared/components/ui/input'
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

import {
  AddButton,
  bindNullableText,
  CodeSelect,
  DateField,
  EuroInput,
  FieldRow,
  FieldRows,
  FormSection,
  RemoveButton,
  SwitchRow
} from './form-controls'
import { netRentAlert } from './schedule-edits'

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

function formatCurrency(value: number | null): string | null {
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

export function ScheduleSection({
  schedule,
  onScheduleChange,
  onIncludedChange,
  assessment,
  onAssessmentChange
}: {
  schedule: ScheduleValue | null
  onScheduleChange: (schedule: ScheduleValue) => void
  onIncludedChange: (included: boolean) => void
  assessment: {
    appreciation_echeancier: ScheduleAssessment
    motif_non_soutenabilite: string | null
  }
  onAssessmentChange: (assessment: {
    appreciation_echeancier: ScheduleAssessment
    motif_non_soutenabilite: string | null
  }) => void
}) {
  const id = 'echeancier'
  const scheduleConfig = repaymentSetup().schedule
  const [confirmPrompt, setConfirmPrompt] = useState<{
    installments: number
    message: string
  } | null>(null)
  const effortLimit = limitLabel(scheduleConfig.maxEffortPercent, '%')
  const remainderLimit = limitLabel(scheduleConfig.minDailyRemainderEuros, 'euros')
  const gap = schedule == null ? null : scheduleGap(schedule)

  const add = () => {
    if (schedule == null || schedule.echeances.length >= MAX_SCHEDULE_MONTHS) return
    const message = scheduleConfig.confirmAfterInstallments[String(schedule.echeances.length)]
    if (message) {
      setConfirmPrompt({ installments: schedule.echeances.length, message })
      return
    }
    onScheduleChange({ ...schedule, echeances: [...schedule.echeances, blankInstallment()] })
  }

  return (
    <FormSection
      id={id}
      title="Proposition d’échéancier"
      action={
        <Switch
          id={`${id}_proposer`}
          checked={schedule != null}
          aria-label="Proposer un échéancier"
          aria-controls={schedule ? `${id}_details` : undefined}
          aria-expanded={schedule != null}
          onCheckedChange={(next) => onIncludedChange(next === true)}
        />
      }
    >
      {schedule ? (
        <div id={`${id}_details`} className="flex flex-col">
          <div>
            <FieldRows>
              <SwitchRow
                id={`${id}_ancienne_dette`}
                title="Inclure l’ancienne dette locative dans l'échéancier"
                description="Faut-il inclure l’ancienne dette au montant total à apurer ?"
                checked={schedule.inclure_ancienne_dette_locative}
                onCheckedChange={(inclure_ancienne_dette_locative) =>
                  onScheduleChange({ ...schedule, inclure_ancienne_dette_locative })
                }
              />
              <SwitchRow
                id={`${id}_contestation`}
                title="Inclure le montant contesté dans l'échéancier"
                description="Faut-il inclure le montant contesté dans le montant total à apurer ?"
                checked={
                  schedule.traitement_montant_conteste === 'inclus' ||
                  schedule.traitement_montant_conteste === 'non_concerne'
                }
                onCheckedChange={(included) =>
                  onScheduleChange({
                    ...schedule,
                    traitement_montant_conteste: included ? 'inclus' : 'exclu'
                  })
                }
              />
              <FieldRow
                title="Montant total à apurer"
                description="Indique automatiquement le montant total à apurer, tenant compte des choix ci-dessus relatifs à une éventuelle ancienne dette et une éventuelle contestation."
              >
                <EuroInput
                  id="montant_a_apurer"
                  label="Montant total à apurer"
                  value={schedule.montant_a_apurer_en_euros}
                  disabled
                />
              </FieldRow>
            </FieldRows>
            <div className="border-border/60 mt-2 flex flex-col gap-4 border-t pt-2">
              <div className="flex items-start justify-between gap-2">
                <FieldContent>
                  <FieldLabel>Proposition d’échéancier</FieldLabel>
                  <FieldDescription>
                    Vous pouvez ajouter ou supprimer des échéances, ainsi que modifier leur montant
                    et leur date, et ce, afin d'adapter le plan de remboursement à la capacité
                    financière du ménage.{' '}
                  </FieldDescription>
                </FieldContent>
                <AddButton
                  id="echeancier_ajouter"
                  disabled={schedule.echeances.length >= MAX_SCHEDULE_MONTHS}
                  onClick={add}
                >
                  Ajouter une échéance
                </AddButton>
              </div>
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
                <TableCaption className="sr-only">Proposition d'échéancier</TableCaption>
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
                  {schedule.echeances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <span className="text-muted-foreground">Aucune échéance.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedule.echeances.map((installment, index) => {
                      const alert = netRentAlert(
                        installment.taux_effort_loyer_net,
                        installment.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros,
                        scheduleConfig.maxEffortPercent,
                        scheduleConfig.minDailyRemainderEuros
                      )
                      const cells = [
                        { text: formatCurrency(installment.ressources_totales_du_mois_en_euros) },
                        { text: formatCurrency(installment.charges_totales_du_mois_en_euros) },
                        { text: unitsLabel(installment.unites_de_consommation) },
                        { text: percent(installment.taux_effort_loyer_net), alert },
                        {
                          text: formatCurrency(
                            installment.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros
                          ),
                          alert
                        },
                        { text: percent(installment.taux_effort_global) },
                        {
                          text: formatCurrency(
                            installment.reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros
                          )
                        }
                      ]
                      return (
                        <TableRow key={`installment-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="min-w-0">
                            <DateField
                              id={`echeancier_${index}_date`}
                              value={installment.date_echeance}
                              onChange={(date_echeance) =>
                                onScheduleChange({
                                  ...schedule,
                                  echeances: schedule.echeances.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, date_echeance } : item
                                  )
                                })
                              }
                              label={`Date de l’échéance ${index + 1}`}
                            />
                          </TableCell>
                          <TableCell className="min-w-0">
                            <EuroInput
                              id={`${id}_${index}_montant`}
                              label={`Mensualité ${index + 1}`}
                              value={installment.montant_en_euros}
                              onChange={(montant_en_euros) =>
                                onScheduleChange({
                                  ...schedule,
                                  echeances: schedule.echeances.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, montant_en_euros } : item
                                  )
                                })
                              }
                            />
                          </TableCell>
                          {cells.map((cell, metricIndex) => (
                            <TableCell key={metricIndex}>
                              <MetricCell text={cell.text} alert={cell.alert === true} />
                            </TableCell>
                          ))}
                          <TableCell>
                            <RemoveButton
                              label={`Retirer l’échéance ${index + 1}`}
                              onClick={() =>
                                onScheduleChange({
                                  ...schedule,
                                  echeances: schedule.echeances.filter(
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
              {gap != null && gap !== 0 ? (
                <FieldDescription>
                  Écart avec le montant à apurer : {euro.format(Math.abs(gap))}{' '}
                  {gap > 0 ? 'restent à répartir' : 'sont répartis en trop'}.
                </FieldDescription>
              ) : null}
              <ConfirmDialog
                open={confirmPrompt != null}
                title={confirmPrompt ? `Plus de ${confirmPrompt.installments} mensualités !` : ''}
                description={confirmPrompt?.message ?? ''}
                confirmLabel="J’ai compris"
                onConfirm={() => {
                  setConfirmPrompt(null)
                  onScheduleChange({
                    ...schedule,
                    echeances: [...schedule.echeances, blankInstallment()]
                  })
                }}
                onCancel={() => setConfirmPrompt(null)}
              />
            </div>
          </div>
          <div className="border-border/60 mt-2 border-t pt-2">
            <FieldRows>
              <FieldRow
                title="Soutenabilité de l’échéancier"
                description="La proposition d'échéancier affichée ci-dessus est-elle soutenable ?"
                htmlFor="appreciation_echeancier"
              >
                <CodeSelect
                  id="appreciation_echeancier"
                  label="Appréciation"
                  value={assessment.appreciation_echeancier}
                  options={SCHEDULE_ASSESSMENTS}
                  onValueChange={(appreciation_echeancier) => {
                    if (!appreciation_echeancier) return
                    onAssessmentChange({
                      appreciation_echeancier,
                      motif_non_soutenabilite:
                        appreciation_echeancier === 'non_soutenable'
                          ? assessment.motif_non_soutenabilite
                          : null
                    })
                  }}
                />
              </FieldRow>
              {assessment.appreciation_echeancier === 'non_soutenable' ? (
                <FieldRow
                  title="Pourquoi ce n’est pas soutenable"
                  htmlFor="motif_non_soutenabilite"
                >
                  <Input
                    id="motif_non_soutenabilite"
                    {...bindNullableText(
                      assessment.motif_non_soutenabilite,
                      (motif_non_soutenabilite) =>
                        onAssessmentChange({
                          appreciation_echeancier: assessment.appreciation_echeancier,
                          motif_non_soutenabilite
                        })
                    )}
                  />
                </FieldRow>
              ) : null}
            </FieldRows>
          </div>
        </div>
      ) : null}
    </FormSection>
  )
}

function MetricCell({ text, alert }: { text: string | null; alert: boolean }) {
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

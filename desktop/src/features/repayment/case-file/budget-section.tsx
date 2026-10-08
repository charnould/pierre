import {
  blankMonthlyLine,
  blankOneOffLine,
  type CommonData,
  HOUSING_COST,
  MONTHLY_EXPENSES,
  MONTHLY_INCOME,
  type MonthlyLine,
  ONE_OFF_EXPENSES,
  ONE_OFF_INCOME,
  type OneOffLine,
  PROOF_LEVELS
} from '@pierre/shared/repayment-case-file'
import { Children, type ReactNode } from 'react'

import { toLocalIsoDate } from '@/shared/components/ui/date-picker'
import { FieldDescription, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'

import {
  CodeSelect,
  DateField,
  EuroInput,
  FormSection,
  RemoveButton,
  TableFieldSet
} from './form-controls'

function updateAt<T>(items: readonly T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
}

const HOUSEHOLD_OPTION = 'foyer'

export function BudgetSection({
  household,
  budget,
  onChange
}: {
  household: CommonData['foyer']
  budget: CommonData['budget']
  onChange: (patch: Partial<CommonData['budget']>) => void
}) {
  const people = householdPersonOptions(household)

  return (
    <FormSection id="budget" title="Budget du foyer">
      <FieldSet>
        <FieldLegend variant="legend">Ressources</FieldLegend>
        <FieldDescription>
          Sommes perçues par le foyer, régulièrement ou une seule fois. Laissez les dates vides si
          la ligne s’applique tout le temps.
        </FieldDescription>
        <TableFieldSet
          addId="ressources_mensuelles_ajouter"
          title="Mensuelles"
          description="Revenus perçus chaque mois."
          onAdd={() =>
            onChange({
              ressources_mensuelles: [...budget.ressources_mensuelles, blankMonthlyLine()]
            })
          }
        >
          <BudgetTable caption="Ressources mensuelles" dates="range">
            {budget.ressources_mensuelles.map((monthly, index) => (
              <TableRow key={`monthly-income-${index}`}>
                <TableCell>
                  <Select
                    value={monthly.type}
                    onValueChange={(type) =>
                      onChange({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          type: typeof type === 'string' ? type : null
                        })
                      })
                    }
                    items={Object.fromEntries(
                      MONTHLY_INCOME.flatMap(([, rows]) =>
                        rows.map(([code, label]) => [code, label])
                      )
                    )}
                  >
                    <SelectTrigger
                      id={`ressource_mensuelle_${index}_type`}
                      aria-label="Type de ressource"
                      className="w-full"
                    >
                      <SelectValue placeholder="Ressource" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="w-96">
                      {MONTHLY_INCOME.map(([group, rows]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {rows.map(([code, label, detail]) => (
                            <SelectItem key={code} value={code} description={detail}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <BudgetPersonSelect
                    id={`ressource_mensuelle_${index}_personne`}
                    people={people}
                    value={monthly.id_personne}
                    onValueChange={(id_personne) =>
                      onChange({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <EuroInput
                    id={`ressource_mensuelle_${index}_montant`}
                    className="w-full"
                    label="Montant de la ressource"
                    value={monthly.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      onChange({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ProofLevelSelect
                    id={`ressource_mensuelle_${index}_preuve`}
                    line={monthly}
                    onChange={(next) =>
                      onChange({
                        ressources_mensuelles: budget.ressources_mensuelles.map(
                          (item, itemIndex) => (itemIndex === index ? next : item)
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <DateField
                    id={`ressource_mensuelle_${index}_debut`}
                    className="w-fit justify-self-start"
                    label="Début"
                    value={monthly.date_debut}
                    onChange={(date_debut) =>
                      onChange({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          date_debut
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <DateField
                    id={`ressource_mensuelle_${index}_fin`}
                    className="w-fit justify-self-start"
                    label="Fin"
                    value={monthly.date_fin}
                    onChange={(date_fin) =>
                      onChange({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          date_fin
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la ressource"
                    onClick={() =>
                      onChange({
                        ressources_mensuelles: budget.ressources_mensuelles.filter(
                          (_, itemIndex) => itemIndex !== index
                        )
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </BudgetTable>
        </TableFieldSet>
        <TableFieldSet
          title="Ponctuelles"
          description="Revenus perçus une seule fois, imputés à un mois."
          onAdd={() =>
            onChange({
              ressources_ponctuelles: [...budget.ressources_ponctuelles, blankOneOffLine()]
            })
          }
        >
          <BudgetTable caption="Ressources ponctuelles" dates="month">
            {budget.ressources_ponctuelles.map((oneOff, index) => (
              <TableRow key={`one-off-income-${index}`}>
                <TableCell>
                  <CodeSelect
                    id={`ressource_ponctuelle_${index}_type`}
                    className="w-full"
                    label="Ressource"
                    value={oneOff.type}
                    options={ONE_OFF_INCOME}
                    onValueChange={(type) =>
                      onChange({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          type
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <BudgetPersonSelect
                    id={`ressource_ponctuelle_${index}_personne`}
                    people={people}
                    value={oneOff.id_personne}
                    onValueChange={(id_personne) =>
                      onChange({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <EuroInput
                    id={`ressource_ponctuelle_${index}_montant`}
                    className="w-full"
                    label="Montant ponctuel"
                    value={oneOff.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      onChange({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ProofLevelSelect
                    id={`ressource_ponctuelle_${index}_preuve`}
                    line={oneOff}
                    onChange={(next) =>
                      onChange({
                        ressources_ponctuelles: budget.ressources_ponctuelles.map(
                          (item, itemIndex) => (itemIndex === index ? next : item)
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ImputationMonthField
                    id={`ressource_ponctuelle_${index}_mois`}
                    value={oneOff.mois_imputation}
                    onChange={(mois_imputation) =>
                      onChange({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          mois_imputation
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell />
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la ressource ponctuelle"
                    onClick={() =>
                      onChange({
                        ressources_ponctuelles: budget.ressources_ponctuelles.filter(
                          (_, itemIndex) => itemIndex !== index
                        )
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </BudgetTable>
        </TableFieldSet>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="legend">Charges</FieldLegend>
        <FieldDescription>
          Le coût net du logement est une charge : loyer et charges, déduction faite des aides au
          logement.
        </FieldDescription>
        <TableFieldSet
          addId="charges_mensuelles_ajouter"
          title="Mensuelles"
          description="Dépenses dues chaque mois."
          onAdd={() =>
            onChange({ charges_mensuelles: [...budget.charges_mensuelles, blankMonthlyLine()] })
          }
        >
          <BudgetTable caption="Charges mensuelles" dates="range">
            {budget.charges_mensuelles.map((charge, index) => {
              const netRent = index === 0 && charge.type === HOUSING_COST
              return (
                <TableRow key={`monthly-expense-${index}`}>
                  <TableCell>
                    {netRent ? (
                      <Input
                        id={`charge_mensuelle_${index}_type`}
                        aria-label="Loyer net"
                        value="Loyer net"
                        disabled
                      />
                    ) : (
                      <CodeSelect
                        id={`charge_mensuelle_${index}_type`}
                        className="w-full"
                        label="Charge"
                        value={charge.type}
                        options={MONTHLY_EXPENSES.filter(([code]) => code !== HOUSING_COST)}
                        onValueChange={(type) =>
                          onChange({
                            charges_mensuelles: updateAt(budget.charges_mensuelles, index, { type })
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <BudgetPersonSelect
                      id={`charge_mensuelle_${index}_personne`}
                      people={people}
                      value={charge.id_personne}
                      onValueChange={(id_personne) =>
                        onChange({
                          charges_mensuelles: updateAt(budget.charges_mensuelles, index, {
                            id_personne
                          })
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <EuroInput
                      id={`charge_mensuelle_${index}_montant`}
                      className="w-full"
                      label="Montant de la charge"
                      value={charge.montant_en_euros}
                      onChange={(montant_en_euros) =>
                        onChange({
                          charges_mensuelles: updateAt(budget.charges_mensuelles, index, {
                            montant_en_euros
                          })
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <ProofLevelSelect
                      id={`charge_mensuelle_${index}_preuve`}
                      line={charge}
                      onChange={(next) =>
                        onChange({
                          charges_mensuelles: budget.charges_mensuelles.map((item, itemIndex) =>
                            itemIndex === index ? next : item
                          )
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DateField
                      id={`charge_mensuelle_${index}_debut`}
                      className="w-fit justify-self-start"
                      label="Début"
                      value={charge.date_debut}
                      onChange={(date_debut) =>
                        onChange({
                          charges_mensuelles: updateAt(budget.charges_mensuelles, index, {
                            date_debut
                          })
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DateField
                      id={`charge_mensuelle_${index}_fin`}
                      className="w-fit justify-self-start"
                      label="Fin"
                      value={charge.date_fin}
                      onChange={(date_fin) =>
                        onChange({
                          charges_mensuelles: updateAt(budget.charges_mensuelles, index, {
                            date_fin
                          })
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {netRent ? null : (
                      <RemoveButton
                        label="Retirer la charge"
                        onClick={() =>
                          onChange({
                            charges_mensuelles: budget.charges_mensuelles.filter(
                              (_, itemIndex) => itemIndex !== index
                            )
                          })
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </BudgetTable>
        </TableFieldSet>
        <TableFieldSet
          title="Ponctuelles"
          description="Dépenses limitées à un mois donné."
          onAdd={() =>
            onChange({ charges_ponctuelles: [...budget.charges_ponctuelles, blankOneOffLine()] })
          }
        >
          <BudgetTable caption="Charges ponctuelles" dates="month">
            {budget.charges_ponctuelles.map((oneOff, index) => (
              <TableRow key={`one-off-expense-${index}`}>
                <TableCell>
                  <CodeSelect
                    id={`charge_ponctuelle_${index}_type`}
                    className="w-full"
                    label="Charge"
                    value={oneOff.type}
                    options={ONE_OFF_EXPENSES}
                    onValueChange={(type) =>
                      onChange({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, { type })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <BudgetPersonSelect
                    id={`charge_ponctuelle_${index}_personne`}
                    people={people}
                    value={oneOff.id_personne}
                    onValueChange={(id_personne) =>
                      onChange({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <EuroInput
                    id={`charge_ponctuelle_${index}_montant`}
                    className="w-full"
                    label="Montant de la charge ponctuelle"
                    value={oneOff.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      onChange({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ProofLevelSelect
                    id={`charge_ponctuelle_${index}_preuve`}
                    line={oneOff}
                    onChange={(next) =>
                      onChange({
                        charges_ponctuelles: budget.charges_ponctuelles.map((item, itemIndex) =>
                          itemIndex === index ? next : item
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ImputationMonthField
                    id={`charge_ponctuelle_${index}_mois`}
                    value={oneOff.mois_imputation}
                    onChange={(mois_imputation) =>
                      onChange({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, {
                          mois_imputation
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell />
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la charge ponctuelle"
                    onClick={() =>
                      onChange({
                        charges_ponctuelles: budget.charges_ponctuelles.filter(
                          (_, itemIndex) => itemIndex !== index
                        )
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </BudgetTable>
        </TableFieldSet>
      </FieldSet>
    </FormSection>
  )
}

type PersonChoice = { id: string; label: string }

export function householdPersonOptions(household: CommonData['foyer']): PersonChoice[] {
  const people = [...household.adultes, ...household.enfants].flatMap((person) => {
    const label = [person.prenom, person.nom]
      .map((part) => part?.trim() ?? '')
      .filter((part) => part !== '')
      .join(' ')
    if (!label) return []
    return [{ id: person.id_personne, label }]
  })
  return [{ id: HOUSEHOLD_OPTION, label: 'Foyer' }, ...people]
}

export function personSelectOptions(
  people: readonly PersonChoice[],
  current: string
): PersonChoice[] {
  return people.some((person) => person.id === current)
    ? [...people]
    : [...people, { id: current, label: current }]
}

function toStoredPersonId(value: string | null): string | null {
  return value == null || value === HOUSEHOLD_OPTION ? null : value
}

function toPersonSelectValue(value: string | null): string {
  return value ?? HOUSEHOLD_OPTION
}

function withProofLevel<
  T extends { niveau_preuve: OneOffLine['niveau_preuve']; date_niveau_preuve: string | null }
>(line: T, niveau_preuve: OneOffLine['niveau_preuve']): T {
  return {
    ...line,
    niveau_preuve,
    date_niveau_preuve: niveau_preuve == null ? null : toLocalIsoDate(new Date())
  }
}

function BudgetPersonSelect({
  id,
  people,
  value,
  onValueChange
}: {
  id: string
  people: PersonChoice[]
  value: string | null
  onValueChange: (value: string | null) => void
}) {
  const selected = toPersonSelectValue(value)
  return (
    <CodeSelect
      id={id}
      className="w-full"
      label="Personne"
      value={selected}
      options={personSelectOptions(people, selected).map(
        (person) => [person.id, person.label] as const
      )}
      onValueChange={(next) => onValueChange(toStoredPersonId(next))}
    />
  )
}

function ImputationMonthField({
  id,
  value,
  onChange
}: {
  id: string
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <DateField
      id={id}
      className="w-fit justify-self-start"
      value={value ? `${value}-01` : null}
      onChange={(date) => onChange(date ? date.slice(0, 7) : null)}
      label="Mois"
    />
  )
}

function ProofLevelSelect<T extends MonthlyLine | OneOffLine>({
  id,
  line,
  onChange
}: {
  id: string
  line: T
  onChange: (line: T) => void
}) {
  return (
    <CodeSelect
      id={id}
      className="w-full"
      label="Sélectionner"
      value={line.niveau_preuve}
      options={PROOF_LEVELS}
      onValueChange={(niveau_preuve) => onChange(withProofLevel(line, niveau_preuve))}
    />
  )
}

function BudgetTable({
  caption,
  dates,
  children
}: {
  caption: string
  dates: 'range' | 'month'
  children: ReactNode
}) {
  const rows = Children.toArray(children)
  const columns = [
    undefined,
    undefined,
    undefined,
    undefined,
    'w-col-date',
    'w-col-date',
    'w-col-8'
  ]
  return (
    <Table className="table-fixed">
      <colgroup>
        {columns.map((column, index) => (
          <col key={index} className={column} />
        ))}
      </colgroup>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Personne</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Preuve</TableHead>
          {dates === 'range' ? (
            <>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
            </>
          ) : (
            <>
              <TableHead>Mois d'imputation</TableHead>
              <TableHead />
            </>
          )}
          <TableHead className="text-center">
            <span className="sr-only">Retirer</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length ? (
          rows
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <span className="text-muted-foreground">Aucune ligne renseignée.</span>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

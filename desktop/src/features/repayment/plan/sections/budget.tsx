import { Children, type ReactNode } from 'react'

import { FieldDescription, FieldLegend, FieldSet } from '@/shared/components/ui/field'
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
  blankMonthlyLine,
  blankOneOffLine,
  type CommonData,
  MONTHLY_EXPENSES,
  MONTHLY_INCOME,
  type MonthlyLine,
  ONE_OFF_EXPENSES,
  ONE_OFF_INCOME,
  type OneOffLine,
  PROOF_LEVELS
} from '../../../../../../shared/repayment-plan'
import {
  householdPeople,
  personChoices,
  selectedPerson,
  storedPerson,
  withProof
} from '../document'
import { AddRow, CodeSelect, DateField, Euros, RemoveButton, Section } from '../form'

function updateAt<T>(items: readonly T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
}

export function Budget({
  value,
  onChange
}: {
  value: CommonData
  onChange: (value: CommonData) => void
}) {
  const budget = value.budget
  const people = householdPeople(value.foyer)
  const set = (patch: Partial<CommonData['budget']>) =>
    onChange({ ...value, budget: { ...budget, ...patch } })

  return (
    <Section id="budget" title="Budget du foyer">
      <FieldSet>
        <FieldLegend variant="legend">Ressources</FieldLegend>
        <FieldDescription>
          Sommes perçues par le foyer, régulièrement ou une seule fois. Laissez les dates vides si
          la ligne s’applique tout le temps.
        </FieldDescription>
        <AddRow
          title="Mensuelles"
          description="Revenus perçus chaque mois."
          onAdd={() =>
            set({ ressources_mensuelles: [...budget.ressources_mensuelles, blankMonthlyLine()] })
          }
        >
          <BudgetTable caption="Ressources mensuelles">
            {budget.ressources_mensuelles.map((monthly, index) => (
              <TableRow key={`monthly-income-${index}`}>
                <TableCell>
                  <Select
                    value={monthly.type}
                    onValueChange={(type) =>
                      set({
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
                    <SelectTrigger aria-label="Type de ressource" className="w-full">
                      <SelectValue placeholder="Type de ressource récurrente" />
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
                  <Person
                    people={people}
                    value={monthly.id_personne}
                    onValueChange={(id_personne) =>
                      set({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Period
                    line={monthly}
                    onChange={(patch) =>
                      set({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, patch)
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`ressource_mensuelle_${index}_montant`}
                    label="Montant de la ressource"
                    value={monthly.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      set({
                        ressources_mensuelles: updateAt(budget.ressources_mensuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Proof
                    line={monthly}
                    onChange={(next) =>
                      set({
                        ressources_mensuelles: budget.ressources_mensuelles.map(
                          (item, itemIndex) => (itemIndex === index ? next : item)
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la ressource"
                    onClick={() =>
                      set({
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
        </AddRow>
        <AddRow
          title="Ponctuelles"
          description="Revenus perçus une seule fois, imputés à un mois."
          onAdd={() =>
            set({ ressources_ponctuelles: [...budget.ressources_ponctuelles, blankOneOffLine()] })
          }
        >
          <BudgetTable caption="Ressources ponctuelles">
            {budget.ressources_ponctuelles.map((oneOff, index) => (
              <TableRow key={`one-off-income-${index}`}>
                <TableCell>
                  <CodeSelect
                    label="Type de ressource ponctuelle"
                    value={oneOff.type}
                    options={ONE_OFF_INCOME}
                    onValueChange={(type) =>
                      set({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          type
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Person
                    people={people}
                    value={oneOff.id_personne}
                    onValueChange={(id_personne) =>
                      set({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Month
                    value={oneOff.mois_imputation}
                    onChange={(mois_imputation) =>
                      set({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          mois_imputation
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`ressource_ponctuelle_${index}_montant`}
                    label="Montant ponctuel"
                    value={oneOff.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      set({
                        ressources_ponctuelles: updateAt(budget.ressources_ponctuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Proof
                    line={oneOff}
                    onChange={(next) =>
                      set({
                        ressources_ponctuelles: budget.ressources_ponctuelles.map(
                          (item, itemIndex) => (itemIndex === index ? next : item)
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la ressource ponctuelle"
                    onClick={() =>
                      set({
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
        </AddRow>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="legend">Charges</FieldLegend>
        <FieldDescription>
          Le coût net du logement est une charge : loyer et charges, déduction faite des aides au
          logement.
        </FieldDescription>
        <AddRow
          title="Mensuelles"
          description="Dépenses dues chaque mois."
          onAdd={() =>
            set({ charges_mensuelles: [...budget.charges_mensuelles, blankMonthlyLine()] })
          }
        >
          <BudgetTable caption="Charges mensuelles">
            {budget.charges_mensuelles.map((charge, index) => (
              <TableRow key={`monthly-expense-${index}`}>
                <TableCell>
                  <CodeSelect
                    label="Type de charge récurrente"
                    value={charge.type}
                    options={MONTHLY_EXPENSES}
                    onValueChange={(type) =>
                      set({
                        charges_mensuelles: updateAt(budget.charges_mensuelles, index, { type })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Person
                    people={people}
                    value={charge.id_personne}
                    onValueChange={(id_personne) =>
                      set({
                        charges_mensuelles: updateAt(budget.charges_mensuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Period
                    line={charge}
                    onChange={(patch) =>
                      set({ charges_mensuelles: updateAt(budget.charges_mensuelles, index, patch) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`charge_mensuelle_${index}_montant`}
                    label="Montant de la charge"
                    value={charge.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      set({
                        charges_mensuelles: updateAt(budget.charges_mensuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Proof
                    line={charge}
                    onChange={(next) =>
                      set({
                        charges_mensuelles: budget.charges_mensuelles.map((item, itemIndex) =>
                          itemIndex === index ? next : item
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la charge"
                    onClick={() =>
                      set({
                        charges_mensuelles: budget.charges_mensuelles.filter(
                          (_, itemIndex) => itemIndex !== index
                        )
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </BudgetTable>
        </AddRow>
        <AddRow
          title="Ponctuelles"
          description="Dépenses limitées à un mois donné."
          onAdd={() =>
            set({ charges_ponctuelles: [...budget.charges_ponctuelles, blankOneOffLine()] })
          }
        >
          <BudgetTable caption="Charges ponctuelles">
            {budget.charges_ponctuelles.map((oneOff, index) => (
              <TableRow key={`one-off-expense-${index}`}>
                <TableCell>
                  <CodeSelect
                    label="Type de charge ponctuelle"
                    value={oneOff.type}
                    options={ONE_OFF_EXPENSES}
                    onValueChange={(type) =>
                      set({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, { type })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Person
                    people={people}
                    value={oneOff.id_personne}
                    onValueChange={(id_personne) =>
                      set({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, {
                          id_personne
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Month
                    value={oneOff.mois_imputation}
                    onChange={(mois_imputation) =>
                      set({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, {
                          mois_imputation
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`charge_ponctuelle_${index}_montant`}
                    label="Montant de la charge ponctuelle"
                    value={oneOff.montant_en_euros}
                    onChange={(montant_en_euros) =>
                      set({
                        charges_ponctuelles: updateAt(budget.charges_ponctuelles, index, {
                          montant_en_euros
                        })
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Proof
                    line={oneOff}
                    onChange={(next) =>
                      set({
                        charges_ponctuelles: budget.charges_ponctuelles.map((item, itemIndex) =>
                          itemIndex === index ? next : item
                        )
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la charge ponctuelle"
                    onClick={() =>
                      set({
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
        </AddRow>
      </FieldSet>
    </Section>
  )
}

function Person({
  people,
  value,
  onValueChange
}: {
  people: ReturnType<typeof householdPeople>
  value: string | null
  onValueChange: (value: string | null) => void
}) {
  return (
    <CodeSelect
      label="Personne"
      value={selectedPerson(value)}
      options={personChoices(people, selectedPerson(value)).map(
        (person) => [person.id, person.label] as const
      )}
      onValueChange={(next) => onValueChange(storedPerson(next))}
    />
  )
}

function Period({
  line,
  onChange
}: {
  line: MonthlyLine
  onChange: (patch: Partial<MonthlyLine>) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <DateField
        value={line.date_debut}
        onChange={(date_debut) => onChange({ date_debut })}
        label="Début"
        empty="Début"
      />
      <DateField
        value={line.date_fin}
        onChange={(date_fin) => onChange({ date_fin })}
        label="Fin"
        empty="Fin"
      />
    </div>
  )
}

function Month({
  value,
  onChange
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <DateField
      value={value ? `${value}-01` : null}
      onChange={(date) => onChange(date ? date.slice(0, 7) : null)}
      label="Mois"
    />
  )
}

function Proof<T extends MonthlyLine | OneOffLine>({
  line,
  onChange
}: {
  line: T
  onChange: (line: T) => void
}) {
  return (
    <CodeSelect
      label="Niveau de preuve"
      value={line.niveau_preuve}
      options={PROOF_LEVELS}
      onValueChange={(niveau_preuve) => onChange(withProof(line, niveau_preuve))}
    />
  )
}

function BudgetTable({ caption, children }: { caption: string; children: ReactNode }) {
  const rows = Children.toArray(children)
  return (
    <Table className="table-fixed">
      <colgroup>
        <col className="w-col-22" />
        <col className="w-col-18" />
        <col className="w-col-20" />
        <col className="w-col-16" />
        <col className="w-col-16" />
        <col className="w-col-8" />
      </colgroup>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Personne</TableHead>
          <TableHead>Période</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Preuve</TableHead>
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
            <TableCell colSpan={6}>
              <span className="text-muted-foreground">Aucune ligne renseignée.</span>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

import { Children, type ReactNode } from 'react'

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
  type CaseFile,
  householdPeople,
  MONTHLY_EXPENSES,
  MONTHLY_INCOME,
  type MonthlyExpense,
  type MonthlyIncome,
  ONE_OFF_EXPENSES,
  ONE_OFF_INCOME,
  type OneOffExpense,
  type OneOffIncome,
  personChoices,
  UNASSIGNED_PERSON
} from '../document'
import { AddRow, DateField, Euros, RemoveButton, Section, SimpleSelect } from '../form'

const EMPTY_MONTHLY_INCOME: MonthlyIncome = {
  type: null,
  personne: UNASSIGNED_PERSON,
  montant_euros: null
}

const EMPTY_ONE_OFF_INCOME: OneOffIncome = {
  type: null,
  personne: UNASSIGNED_PERSON,
  date_imputation: null,
  montant_euros: null
}

const EMPTY_MONTHLY_EXPENSE: MonthlyExpense = {
  type: null,
  personne: UNASSIGNED_PERSON,
  date_fin: null,
  montant_euros: null
}

const EMPTY_ONE_OFF_EXPENSE: OneOffExpense = {
  type: null,
  personne: UNASSIGNED_PERSON,
  date_imputation: null,
  montant_euros: null
}

function updateAt<T>(items: readonly T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
}

export function Budget({
  foyer,
  value,
  onChange
}: {
  foyer: CaseFile['foyer']
  value: CaseFile['budget']
  onChange: (value: CaseFile['budget']) => void
}) {
  const people = householdPeople(foyer)
  const updateMonthly = (index: number, patch: Partial<MonthlyIncome>) =>
    onChange({
      ...value,
      ressources_mensuelles: updateAt(value.ressources_mensuelles, index, patch)
    })
  const updateOneOff = (index: number, patch: Partial<OneOffIncome>) =>
    onChange({
      ...value,
      ressources_ponctuelles: updateAt(value.ressources_ponctuelles, index, patch)
    })
  const updateExpense = (index: number, patch: Partial<MonthlyExpense>) =>
    onChange({ ...value, charges_mensuelles: updateAt(value.charges_mensuelles, index, patch) })
  const updateOneOffExpense = (index: number, patch: Partial<OneOffExpense>) =>
    onChange({
      ...value,
      charges_ponctuelles: updateAt(value.charges_ponctuelles, index, patch)
    })

  return (
    <Section id="budget" title="Budget du foyer">
      <FieldSet>
        <FieldLegend variant="legend">Ressources</FieldLegend>
        <FieldDescription>
          Ensemble des sommes perçues par les membres du foyer, de façon régulière ou
          exceptionnelle.
        </FieldDescription>
        <AddRow
          title="Mensuelles"
          description="Revenus perçus chaque mois."
          onAdd={() =>
            onChange({
              ...value,
              ressources_mensuelles: [...value.ressources_mensuelles, { ...EMPTY_MONTHLY_INCOME }]
            })
          }
        >
          <BudgetTable
            caption="Ressources mensuelles"
            heads={
              <>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>
                  <span className="sr-only">Date</span>
                </TableHead>
                <TableHead>Montant</TableHead>
                <TableHead className="text-center">
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </>
            }
          >
            {value.ressources_mensuelles.map((monthly, index) => (
              <TableRow key={`monthly-income-${index}`}>
                <TableCell>
                  <Select
                    value={monthly.type}
                    onValueChange={(type) =>
                      updateMonthly(index, { type: typeof type === 'string' ? type : null })
                    }
                    items={Object.fromEntries(
                      MONTHLY_INCOME.flatMap(([, rows]) => rows.map(([item]) => [item, item]))
                    )}
                  >
                    <SelectTrigger aria-label="Type de ressource" className="w-full">
                      <SelectValue placeholder="Type de ressource récurrente" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="w-96">
                      {MONTHLY_INCOME.map(([group, rows]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {rows.map(([item, detail]) => (
                            <SelectItem key={item} value={item} description={detail}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <SimpleSelect
                    label="Personne"
                    value={monthly.personne}
                    onValueChange={(personne) => {
                      if (personne) updateMonthly(index, { personne })
                    }}
                    options={personChoices(people, monthly.personne)}
                  />
                </TableCell>
                <TableCell />
                <TableCell>
                  <Euros
                    id={`ressource_mensuelle_${index}_montant_euros`}
                    label="Montant de la ressource"
                    value={monthly.montant_euros}
                    onChange={(montant_euros) => updateMonthly(index, { montant_euros })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la ressource"
                    onClick={() =>
                      onChange({
                        ...value,
                        ressources_mensuelles: value.ressources_mensuelles.filter(
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
          description="Revenus et sommes perçus une seule fois."
          onAdd={() =>
            onChange({
              ...value,
              ressources_ponctuelles: [...value.ressources_ponctuelles, { ...EMPTY_ONE_OFF_INCOME }]
            })
          }
        >
          <BudgetTable
            caption="Ressources ponctuelles"
            heads={
              <>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>Mois d'imputation</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead className="text-center">
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </>
            }
          >
            {value.ressources_ponctuelles.map((oneOff, index) => (
              <TableRow key={`one-off-income-${index}`}>
                <TableCell>
                  <SimpleSelect
                    label="Type de ressource ponctuelle"
                    value={oneOff.type}
                    onValueChange={(type) => updateOneOff(index, { type })}
                    options={ONE_OFF_INCOME}
                  />
                </TableCell>
                <TableCell>
                  <SimpleSelect
                    label="Personne"
                    value={oneOff.personne}
                    onValueChange={(personne) => {
                      if (personne) updateOneOff(index, { personne })
                    }}
                    options={personChoices(people, oneOff.personne)}
                  />
                </TableCell>
                <TableCell>
                  <DateField
                    value={oneOff.date_imputation}
                    onChange={(date_imputation) => updateOneOff(index, { date_imputation })}
                    label="Mois"
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`ressource_ponctuelle_${index}_montant_euros`}
                    label="Montant ponctuel"
                    value={oneOff.montant_euros}
                    onChange={(montant_euros) => updateOneOff(index, { montant_euros })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la ressource ponctuelle"
                    onClick={() =>
                      onChange({
                        ...value,
                        ressources_ponctuelles: value.ressources_ponctuelles.filter(
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
          Ensemble des sommes dues par les membres du foyer, de façon régulière ou exceptionnelle.
        </FieldDescription>
        <AddRow
          title="Mensuelles"
          description="Dépenses dues chaque mois."
          onAdd={() =>
            onChange({
              ...value,
              charges_mensuelles: [...value.charges_mensuelles, { ...EMPTY_MONTHLY_EXPENSE }]
            })
          }
        >
          <BudgetTable
            caption="Charges mensuelles"
            heads={
              <>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>Fin du crédit</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead className="text-center">
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </>
            }
          >
            <TableRow>
              <TableCell>
                <Input
                  readOnly
                  value="Loyer + Charges - Aides au logement"
                  aria-label="Type de charge récurrente"
                />
              </TableCell>
              <TableCell />
              <TableCell>
                <span className="text-muted-foreground">—</span>
              </TableCell>
              <TableCell>
                <Euros
                  id="loyer_charges_moins_aides_au_logement_euros"
                  label="Montant du loyer"
                  value={value.loyer_charges_moins_aides_au_logement_euros}
                  onChange={(loyer_charges_moins_aides_au_logement_euros) =>
                    onChange({ ...value, loyer_charges_moins_aides_au_logement_euros })
                  }
                />
              </TableCell>
              <TableCell />
            </TableRow>
            {value.charges_mensuelles.map((charge, index) => (
              <TableRow key={`monthly-expense-${index}`}>
                <TableCell>
                  <SimpleSelect
                    label="Type de charge récurrente"
                    value={charge.type}
                    onValueChange={(type) => updateExpense(index, { type })}
                    options={MONTHLY_EXPENSES}
                  />
                </TableCell>
                <TableCell>
                  <SimpleSelect
                    label="Personne"
                    value={charge.personne || UNASSIGNED_PERSON}
                    onValueChange={(personne) => {
                      if (personne) updateExpense(index, { personne })
                    }}
                    options={personChoices(people, charge.personne || UNASSIGNED_PERSON)}
                  />
                </TableCell>
                <TableCell>
                  <DateField
                    value={charge.date_fin}
                    onChange={(date_fin) => updateExpense(index, { date_fin })}
                    label="Fin du crédit"
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`charge_mensuelle_${index}_montant_euros`}
                    label="Montant de la charge"
                    value={charge.montant_euros}
                    onChange={(montant_euros) => updateExpense(index, { montant_euros })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la charge"
                    onClick={() =>
                      onChange({
                        ...value,
                        charges_mensuelles: value.charges_mensuelles.filter(
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
            onChange({
              ...value,
              charges_ponctuelles: [...value.charges_ponctuelles, { ...EMPTY_ONE_OFF_EXPENSE }]
            })
          }
        >
          <BudgetTable
            caption="Charges ponctuelles"
            heads={
              <>
                <TableHead>Type</TableHead>
                <TableHead>Personne</TableHead>
                <TableHead>Mois d'imputation</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead className="text-center">
                  <span className="sr-only">Retirer</span>
                </TableHead>
              </>
            }
          >
            {value.charges_ponctuelles.map((oneOffExpense, index) => (
              <TableRow key={`one-off-expense-${index}`}>
                <TableCell>
                  <SimpleSelect
                    label="Type de charge ponctuelle"
                    value={oneOffExpense.type}
                    onValueChange={(type) => updateOneOffExpense(index, { type })}
                    options={ONE_OFF_EXPENSES}
                  />
                </TableCell>
                <TableCell>
                  <SimpleSelect
                    label="Personne"
                    value={oneOffExpense.personne || UNASSIGNED_PERSON}
                    onValueChange={(personne) => {
                      if (personne) updateOneOffExpense(index, { personne })
                    }}
                    options={personChoices(people, oneOffExpense.personne || UNASSIGNED_PERSON)}
                  />
                </TableCell>
                <TableCell>
                  <DateField
                    value={oneOffExpense.date_imputation}
                    onChange={(date_imputation) => updateOneOffExpense(index, { date_imputation })}
                    label="Mois"
                  />
                </TableCell>
                <TableCell>
                  <Euros
                    id={`charge_ponctuelle_${index}_montant_euros`}
                    label="Montant de la charge ponctuelle"
                    value={oneOffExpense.montant_euros}
                    onChange={(montant_euros) => updateOneOffExpense(index, { montant_euros })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label="Retirer la charge ponctuelle"
                    onClick={() =>
                      onChange({
                        ...value,
                        charges_ponctuelles: value.charges_ponctuelles.filter(
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

function BudgetTable({
  caption,
  heads,
  children
}: {
  caption: string
  heads: ReactNode
  children: ReactNode
}) {
  const rows = Children.toArray(children)

  return (
    <Table className="table-fixed">
      <BudgetColumns />
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>{heads}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.length ? (
          rows
        ) : (
          <TableRow>
            <TableCell colSpan={5}>
              <span className="text-muted-foreground">Aucune ligne renseignée.</span>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function BudgetColumns() {
  return (
    <colgroup>
      <col className="w-col-34" />
      <col className="w-col-22" />
      <col className="w-col-20" />
      <col className="w-col-16" />
      <col className="w-col-8" />
    </colgroup>
  )
}

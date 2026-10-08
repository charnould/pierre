import {
  type Adult,
  blankAdult,
  blankChild,
  type Child,
  type CommonData,
  LEASE_STATUSES,
  nextPersonId,
  RESIDENCE_MODES,
  showsCorrespondenceAddress,
  YES_NO
} from '@pierre/shared/repayment-case-file'
import { Ellipsis } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/shared/components/ui/popover'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import {
  AddButton,
  bindNullableText,
  CodeSelect,
  DateField,
  FormSection,
  RemoveButton,
  StringSelect
} from './form-controls'

const EMPLOYMENT_TYPES = [
  'Salarié en CDI',
  'Salarié en CDI (période d’essai)',
  'Salarié en CDD',
  'Salarié en CDD (période d’essai)',
  'Intérimaire',
  'Indépendant / Auto-entrepreneur',
  'Chef d’entreprise',
  'Fonctionnaire / Agent public',
  'Sans emploi',
  'Étudiant',
  'En formation',
  'Retraité',
  'Sans activité professionnelle',
  'Autre'
] as const

export function patchAdult(adult: Adult, patch: Partial<Adult>): Adult {
  const next = { ...adult, ...patch }
  if (!showsCorrespondenceAddress(next.mode_residence)) next.adresse_correspondance = null
  return next
}

export function HouseholdSection({
  household,
  onChange,
  openDetailIndex = null,
  onOpenDetailIndexChange
}: {
  household: CommonData['foyer']
  onChange: (household: CommonData['foyer']) => void
  openDetailIndex?: number | null
  onOpenDetailIndexChange?: (index: number | null) => void
}) {
  const set = onChange
  const updateAdult = (index: number, patch: Partial<Adult>) =>
    set({
      ...household,
      adultes: household.adultes.map((adult, itemIndex) =>
        itemIndex === index ? patchAdult(adult, patch) : adult
      )
    })
  const updateChild = (index: number, patch: Partial<Child>) =>
    set({
      ...household,
      enfants: household.enfants.map((child, itemIndex) =>
        itemIndex === index ? { ...child, ...patch } : child
      )
    })

  return (
    <FormSection id="foyer" title="Membres du foyer">
      <FieldSet>
        <FieldLegend variant="legend">Adultes</FieldLegend>
        <FieldDescription>
          Toutes les personnes majeures du foyer, titulaires ou non.
        </FieldDescription>
        <Table className="table-fixed">
          <colgroup>
            <col />
            <col />
            <col className="w-col-date" />
            <col />
            <col />
            <col />
            <col />
            <col className="w-col-8" />
          </colgroup>
          <TableCaption className="sr-only">Adultes</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Prénom</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Naissance</TableHead>
              <TableHead>Emploi</TableHead>
              <TableHead>Employeur</TableHead>
              <TableHead>N° CAF</TableHead>
              <TableHead>Situation au bail</TableHead>
              <TableHead>
                <span className="sr-only">Détails et retrait</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {household.adultes.map((adult, index) => (
              <TableRow key={adult.id_personne}>
                <PersonIdentityCells
                  id={`adult_${index}`}
                  firstName={adult.prenom}
                  lastName={adult.nom}
                  birth={adult.date_naissance}
                  onFirstName={(prenom) => updateAdult(index, { prenom })}
                  onLastName={(nom) => updateAdult(index, { nom })}
                  onBirth={(date_naissance) => updateAdult(index, { date_naissance })}
                />
                <TableCell className="min-w-0">
                  <StringSelect
                    id={`adult_${index}_type_emploi`}
                    value={adult.type_emploi}
                    onValueChange={(type_emploi) => updateAdult(index, { type_emploi })}
                    options={EMPLOYMENT_TYPES}
                    placeholder="Type"
                    ariaLabel="Type d’emploi"
                    className="w-full"
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <Input
                    id={`adult_${index}_employeur`}
                    aria-label="Employeur"
                    placeholder="Employeur"
                    {...bindNullableText(adult.employeur, (employeur) =>
                      updateAdult(index, { employeur })
                    )}
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <Input
                    id={`adult_${index}_allocataire_caf`}
                    aria-label="N° CAF"
                    placeholder="N° CAF"
                    {...bindNullableText(adult.allocataire_caf, (allocataire_caf) =>
                      updateAdult(index, { allocataire_caf })
                    )}
                  />
                </TableCell>
                <TableCell>
                  <CodeSelect
                    id={`adult_${index}_statut_bail`}
                    className="w-full"
                    label="Situation au bail"
                    value={adult.statut_bail}
                    options={LEASE_STATUSES}
                    onValueChange={(statut_bail) => {
                      if (statut_bail) updateAdult(index, { statut_bail })
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <AdultDetailsPopover
                      index={index}
                      adult={adult}
                      open={onOpenDetailIndexChange ? openDetailIndex === index : undefined}
                      onOpenChange={
                        onOpenDetailIndexChange
                          ? (open) => onOpenDetailIndexChange(open ? index : null)
                          : undefined
                      }
                      onChange={(patch) => updateAdult(index, patch)}
                    />
                    <RemoveButton
                      label={`Retirer ${adultDisplayName(adult, index)}`}
                      disabled={household.adultes.length === 1}
                      onClick={() =>
                        set({
                          ...household,
                          adultes: household.adultes.filter(
                            (item) => item.id_personne !== adult.id_personne
                          )
                        })
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <AddButton
          className="ms-2"
          onClick={() =>
            set({
              ...household,
              adultes: [...household.adultes, blankAdult(nextPersonId(household))]
            })
          }
        >
          Ajouter un adulte
        </AddButton>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="legend">Enfants</FieldLegend>
        <FieldDescription>Toutes les personnes mineures du foyer.</FieldDescription>
        <Table className="table-fixed">
          <colgroup>
            <col />
            <col />
            <col className="w-col-date" />
            <col />
            <col />
            <col className="w-col-8" />
          </colgroup>
          <TableCaption className="sr-only">Enfants</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Prénom</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Naissance</TableHead>
              <TableHead>À charge</TableHead>
              <TableHead>Résidence</TableHead>
              <TableHead className="text-center">
                <span className="sr-only">Retirer</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {household.enfants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <span className="text-muted-foreground">Aucun enfant renseigné.</span>
                </TableCell>
              </TableRow>
            ) : (
              household.enfants.map((child, index) => (
                <TableRow key={child.id_personne}>
                  <PersonIdentityCells
                    id={`child_${index}`}
                    firstName={child.prenom}
                    lastName={child.nom}
                    birth={child.date_naissance}
                    onFirstName={(prenom) => updateChild(index, { prenom })}
                    onLastName={(nom) => updateChild(index, { nom })}
                    onBirth={(date_naissance) => updateChild(index, { date_naissance })}
                  />
                  <TableCell>
                    <CodeSelect
                      id={`child_${index}_a_charge`}
                      className="w-full"
                      label="À charge"
                      value={child.a_charge}
                      options={YES_NO}
                      onValueChange={(a_charge) => {
                        if (a_charge) updateChild(index, { a_charge })
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <CodeSelect
                      id={`child_${index}_mode_residence`}
                      className="w-full"
                      label="Mode de résidence"
                      value={child.mode_residence}
                      options={RESIDENCE_MODES.filter(([code]) => code !== 'non_occupante')}
                      onValueChange={(mode_residence) => updateChild(index, { mode_residence })}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <RemoveButton
                      label={`Retirer ${child.prenom ?? ''} ${child.nom ?? ''}`.trim()}
                      onClick={() =>
                        set({
                          ...household,
                          enfants: household.enfants.filter(
                            (item) => item.id_personne !== child.id_personne
                          )
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <AddButton
          className="ms-2"
          onClick={() =>
            set({
              ...household,
              enfants: [...household.enfants, blankChild(nextPersonId(household))]
            })
          }
        >
          Ajouter un enfant
        </AddButton>
      </FieldSet>
    </FormSection>
  )
}

function AdultDetailsPopover({
  index,
  adult,
  open,
  onOpenChange,
  onChange
}: {
  index: number
  adult: Adult
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onChange: (patch: Partial<Adult>) => void
}) {
  const name = adultDisplayName(adult, index)
  const mail = adult.adresse_correspondance
  const setMail = (patch: Partial<NonNullable<Adult['adresse_correspondance']>>) => {
    const address = {
      adresse: mail?.adresse ?? null,
      code_postal: mail?.code_postal ?? null,
      commune: mail?.commune ?? null,
      ...patch
    }
    const empty = address.adresse == null && address.code_postal == null && address.commune == null
    onChange({ adresse_correspondance: empty ? null : address })
  }
  const notice =
    adult.statut_bail === 'titulaire_actuel' || adult.statut_bail === 'ancien_titulaire'
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  id={`adult_${index}_details`}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Détails de ${name}`}
                />
              }
            />
          }
        >
          <Ellipsis />
        </TooltipTrigger>
        <TooltipContent>Détails</TooltipContent>
      </Tooltip>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Détails — {name}</PopoverTitle>
        </PopoverHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`adult_${index}_mode_residence`}>Occupation</FieldLabel>
            <FieldDescription>Présence réelle de la personne dans le logement.</FieldDescription>
            <CodeSelect
              id={`adult_${index}_mode_residence`}
              label="Occupation"
              value={adult.mode_residence}
              options={RESIDENCE_MODES}
              onValueChange={(mode_residence) => onChange({ mode_residence })}
            />
          </Field>
          {showsCorrespondenceAddress(adult.mode_residence) ? (
            <>
              <Field>
                <FieldLabel htmlFor={`adult_${index}_correspondance_adresse`}>
                  Adresse de correspondance
                </FieldLabel>
                <FieldDescription>
                  Adresse postale, distincte de celle du logement.
                </FieldDescription>
                <Input
                  id={`adult_${index}_correspondance_adresse`}
                  placeholder="12 rue des Lilas"
                  {...bindNullableText(mail?.adresse ?? null, (adresse) => setMail({ adresse }))}
                />
              </Field>
              <FieldGroup className="flex-row">
                <Field className="w-28 shrink-0">
                  <FieldLabel
                    className="sr-only"
                    htmlFor={`adult_${index}_correspondance_code_postal`}
                  >
                    Code postal
                  </FieldLabel>
                  <Input
                    id={`adult_${index}_correspondance_code_postal`}
                    placeholder="Code postal"
                    {...bindNullableText(mail?.code_postal ?? null, (code_postal) =>
                      setMail({ code_postal })
                    )}
                  />
                </Field>
                <Field className="w-auto min-w-0 flex-1">
                  <FieldLabel className="sr-only" htmlFor={`adult_${index}_correspondance_commune`}>
                    Ville
                  </FieldLabel>
                  <Input
                    id={`adult_${index}_correspondance_commune`}
                    placeholder="Ville"
                    {...bindNullableText(mail?.commune ?? null, (commune) => setMail({ commune }))}
                  />
                </Field>
              </FieldGroup>
            </>
          ) : null}
          {notice ? (
            <>
              <Field>
                <FieldLabel htmlFor={`adult_${index}_date_reception_preavis`}>
                  Date de réception du préavis de congé
                </FieldLabel>
                <FieldDescription>Jour où le bailleur a reçu le congé.</FieldDescription>
                <DateField
                  id={`adult_${index}_date_reception_preavis`}
                  value={adult.date_reception_preavis}
                  onChange={(date_reception_preavis) => onChange({ date_reception_preavis })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`adult_${index}_date_effet_conge`}>
                  Date d’effet du congé
                </FieldLabel>
                <FieldDescription>Jour où le congé prend effet.</FieldDescription>
                <DateField
                  id={`adult_${index}_date_effet_conge`}
                  value={adult.date_effet_conge}
                  onChange={(date_effet_conge) => onChange({ date_effet_conge })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`adult_${index}_date_fin_solidarite`}>
                  Date de fin de solidarité
                </FieldLabel>
                <FieldDescription>Dernier jour de solidarité du titulaire parti.</FieldDescription>
                <DateField
                  id={`adult_${index}_date_fin_solidarite`}
                  value={adult.date_fin_solidarite}
                  onChange={(date_fin_solidarite) => onChange({ date_fin_solidarite })}
                />
              </Field>
            </>
          ) : null}
        </FieldGroup>
      </PopoverContent>
    </Popover>
  )
}

function PersonIdentityCells({
  id,
  firstName,
  lastName,
  birth,
  onFirstName,
  onLastName,
  onBirth
}: {
  id: string
  firstName: string | null
  lastName: string | null
  birth: string | null
  onFirstName: (value: string | null) => void
  onLastName: (value: string | null) => void
  onBirth: (value: string | null) => void
}) {
  return (
    <>
      <TableCell className="min-w-0">
        <Input
          id={`${id}_prenom`}
          aria-label="Prénom"
          placeholder="Prénom"
          {...bindNullableText(firstName, onFirstName)}
        />
      </TableCell>
      <TableCell className="min-w-0">
        <Input
          id={`${id}_nom`}
          aria-label="Nom"
          placeholder="Nom"
          {...bindNullableText(lastName, onLastName)}
        />
      </TableCell>
      <TableCell className="min-w-0">
        <DateField
          id={`${id}_date_naissance`}
          value={birth}
          onChange={onBirth}
          label="Date de naissance"
          captionLayout="dropdown"
          className="w-fit justify-self-start"
        />
      </TableCell>
    </>
  )
}

function adultDisplayName(adult: Adult, index: number) {
  return (
    [adult.prenom, adult.nom]
      .map((part) => part?.trim() ?? '')
      .filter(Boolean)
      .join(' ') || `Adulte ${index + 1}`
  )
}

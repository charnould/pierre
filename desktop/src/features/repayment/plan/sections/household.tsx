import { FieldDescription, FieldLegend, FieldSet } from '@/shared/components/ui/field'
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

import { type Adult, type CaseFile, type Child, JOBS } from '../document'
import { AddButton, DateField, PairSelect, RemoveButton, Section, textField } from '../form'

const EMPTY_ADULT: Adult = {
  prenom: null,
  nom: null,
  date_naissance: null,
  type_emploi: null,
  employeur: null,
  numero_allocataire_caf: null,
  titulaire_du_bail: false,
  occupant_du_logement: false
}

const EMPTY_CHILD: Child = {
  prenom: null,
  nom: null,
  date_naissance: null,
  a_charge: false
}

function updateAt<T>(items: readonly T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
}

export function Household({
  value,
  onChange
}: {
  value: CaseFile['foyer']
  onChange: (value: CaseFile['foyer']) => void
}) {
  const updateAdult = (index: number, patch: Partial<Adult>) =>
    onChange({ ...value, adultes: updateAt(value.adultes, index, patch) })
  const updateChild = (index: number, patch: Partial<Child>) =>
    onChange({ ...value, enfants: updateAt(value.enfants, index, patch) })

  return (
    <Section id="locatif" title="Membres du foyer">
      <FieldSet>
        <FieldLegend variant="legend">Adultes</FieldLegend>
        <FieldDescription>
          Toutes les personnes de 18 ans et plus occupant le logement.
        </FieldDescription>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-col-11" />
            <col className="w-col-11" />
            <col className="w-col-14" />
            <col className="w-col-18" />
            <col className="w-col-16" />
            <col className="w-col-12" />
            <col className="w-col-7" />
            <col className="w-col-6" />
            <col className="w-col-5" />
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
              <TableHead className="text-center">Titulaire</TableHead>
              <TableHead className="text-center">Occupant</TableHead>
              <TableHead className="text-center">
                <span className="sr-only">Retirer</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.adultes.map((adult, index) => (
              <TableRow key={`adult-${index}`}>
                <Identity
                  id={`adult_${index}`}
                  firstName={adult.prenom}
                  lastName={adult.nom}
                  birth={adult.date_naissance}
                  onFirstName={(firstName) => updateAdult(index, { prenom: firstName })}
                  onLastName={(lastName) => updateAdult(index, { nom: lastName })}
                  onBirth={(birth) => updateAdult(index, { date_naissance: birth })}
                />
                <TableCell className="min-w-0">
                  <PairSelect
                    id={`adulte_${index}_type_emploi`}
                    value={adult.type_emploi}
                    onValueChange={(type_emploi) => updateAdult(index, { type_emploi })}
                    options={JOBS}
                    placeholder="Type d’emploi"
                    ariaLabel="Type d’emploi"
                    className="min-w-0"
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <Input
                    id={`adulte_${index}_employeur`}
                    aria-label="Employeur"
                    placeholder="Employeur"
                    {...textField(adult.employeur, (employeur) =>
                      updateAdult(index, { employeur })
                    )}
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <Input
                    id={`adulte_${index}_numero_allocataire_caf`}
                    aria-label="N° CAF"
                    placeholder="N° CAF"
                    {...textField(adult.numero_allocataire_caf, (numero_allocataire_caf) =>
                      updateAdult(index, { numero_allocataire_caf })
                    )}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Switch
                      id={`adulte_${index}_titulaire_du_bail`}
                      aria-label="Titulaire"
                      checked={adult.titulaire_du_bail}
                      onCheckedChange={(titulaire_du_bail) =>
                        updateAdult(index, { titulaire_du_bail: titulaire_du_bail === true })
                      }
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Switch
                      id={`adulte_${index}_occupant_du_logement`}
                      aria-label="Occupant"
                      checked={adult.occupant_du_logement}
                      onCheckedChange={(occupant_du_logement) =>
                        updateAdult(index, { occupant_du_logement: occupant_du_logement === true })
                      }
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label={`Retirer ${adult.prenom ?? ''} ${adult.nom ?? ''}`.trim()}
                    disabled={value.adultes.length === 1}
                    onClick={() =>
                      onChange({
                        ...value,
                        adultes: value.adultes.filter((_, itemIndex) => itemIndex !== index)
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <AddButton
          className="ms-2"
          onClick={() => onChange({ ...value, adultes: [...value.adultes, { ...EMPTY_ADULT }] })}
        >
          Ajouter un adulte
        </AddButton>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="legend">Enfants</FieldLegend>
        <FieldDescription>
          Toutes les personnes de moins de 18 ans occupant le logement.
        </FieldDescription>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-col-11" />
            <col className="w-col-11" />
            <col className="w-col-14" />
            <col className="w-col-46" />
            <col className="w-col-7" />
            <col className="w-col-6" />
            <col className="w-col-5" />
          </colgroup>
          <TableCaption className="sr-only">Enfants</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Prénom</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Naissance</TableHead>
              <TableHead />
              <TableHead className="text-center">À charge</TableHead>
              <TableHead />
              <TableHead className="text-center">
                <span className="sr-only">Retirer</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.enfants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <span className="text-muted-foreground">Aucun enfant renseigné.</span>
                </TableCell>
              </TableRow>
            ) : (
              value.enfants.map((child, index) => (
                <TableRow key={`child-${index}`}>
                  <Identity
                    id={`child_${index}`}
                    firstName={child.prenom}
                    lastName={child.nom}
                    birth={child.date_naissance}
                    onFirstName={(firstName) => updateChild(index, { prenom: firstName })}
                    onLastName={(lastName) => updateChild(index, { nom: lastName })}
                    onBirth={(birth) => updateChild(index, { date_naissance: birth })}
                  />
                  <TableCell />
                  <TableCell>
                    <div className="flex justify-center">
                      <Switch
                        id={`enfant_${index}_a_charge`}
                        aria-label="À charge"
                        checked={child.a_charge}
                        onCheckedChange={(a_charge) =>
                          updateChild(index, { a_charge: a_charge === true })
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-center">
                    <RemoveButton
                      label={`Retirer ${child.prenom ?? ''} ${child.nom ?? ''}`.trim()}
                      onClick={() =>
                        onChange({
                          ...value,
                          enfants: value.enfants.filter((_, itemIndex) => itemIndex !== index)
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
          onClick={() => onChange({ ...value, enfants: [...value.enfants, { ...EMPTY_CHILD }] })}
        >
          Ajouter un enfant
        </AddButton>
      </FieldSet>
    </Section>
  )
}

function Identity({
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
          {...textField(firstName, onFirstName)}
        />
      </TableCell>
      <TableCell className="min-w-0">
        <Input
          id={`${id}_nom`}
          aria-label="Nom"
          placeholder="Nom"
          {...textField(lastName, onLastName)}
        />
      </TableCell>
      <TableCell className="min-w-0">
        <DateField
          id={`${id}_date_naissance`}
          value={birth}
          onChange={onBirth}
          label="Date de naissance"
          captionLayout="dropdown"
          className="min-w-0"
        />
      </TableCell>
    </>
  )
}

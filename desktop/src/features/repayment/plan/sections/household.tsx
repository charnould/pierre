import { FieldDescription, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
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
  type Adult,
  blankAddress,
  blankAdult,
  blankChild,
  type Child,
  type CommonData,
  LEASE_STATUSES,
  nextPersonId,
  RESIDENCE_MODES,
  YES_NO
} from '../../../../../../shared/repayment-plan'
import { JOBS, patchAdult } from '../document'
import {
  AddButton,
  CodeSelect,
  DateField,
  PairSelect,
  RemoveButton,
  Row,
  Rows,
  Section,
  textField
} from '../form'

export function Household({
  value,
  onChange
}: {
  value: CommonData
  onChange: (value: CommonData) => void
}) {
  const foyer = value.foyer
  const set = (next: CommonData['foyer']) => onChange({ ...value, foyer: next })
  const updateAdult = (index: number, patch: Partial<Adult>) =>
    set({
      ...foyer,
      adultes: foyer.adultes.map((adult, itemIndex) =>
        itemIndex === index ? patchAdult(adult, patch) : adult
      )
    })
  const updateChild = (index: number, patch: Partial<Child>) =>
    set({
      ...foyer,
      enfants: foyer.enfants.map((child, itemIndex) =>
        itemIndex === index ? { ...child, ...patch } : child
      )
    })

  return (
    <Section id="foyer" title="Membres du foyer">
      <FieldSet>
        <FieldLegend variant="legend">Adultes</FieldLegend>
        <FieldDescription>
          Toutes les personnes majeures du foyer, titulaires ou non.
        </FieldDescription>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-col-11" />
            <col className="w-col-11" />
            <col className="w-col-14" />
            <col className="w-col-16" />
            <col className="w-col-12" />
            <col className="w-col-8" />
            <col className="w-col-12" />
            <col className="w-col-11" />
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
              <TableHead>Bail</TableHead>
              <TableHead>Résidence</TableHead>
              <TableHead className="text-center">
                <span className="sr-only">Retirer</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {foyer.adultes.map((adult, index) => (
              <TableRow key={adult.id_personne}>
                <Identity
                  id={`adult_${index}`}
                  firstName={adult.prenom}
                  lastName={adult.nom}
                  birth={adult.date_naissance}
                  onFirstName={(prenom) => updateAdult(index, { prenom })}
                  onLastName={(nom) => updateAdult(index, { nom })}
                  onBirth={(date_naissance) => updateAdult(index, { date_naissance })}
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
                    id={`adulte_${index}_allocataire_caf`}
                    aria-label="N° CAF"
                    placeholder="N° CAF"
                    {...textField(adult.allocataire_caf, (allocataire_caf) =>
                      updateAdult(index, { allocataire_caf })
                    )}
                  />
                </TableCell>
                <TableCell>
                  <CodeSelect
                    label="Statut au regard du bail"
                    value={adult.statut_bail}
                    options={LEASE_STATUSES}
                    onValueChange={(statut_bail) => {
                      if (statut_bail) updateAdult(index, { statut_bail })
                    }}
                  />
                </TableCell>
                <TableCell>
                  <CodeSelect
                    label="Mode de résidence"
                    value={adult.mode_residence}
                    options={RESIDENCE_MODES}
                    onValueChange={(mode_residence) => updateAdult(index, { mode_residence })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <RemoveButton
                    label={`Retirer ${adult.prenom ?? ''} ${adult.nom ?? ''}`.trim()}
                    disabled={foyer.adultes.length === 1}
                    onClick={() =>
                      set({
                        ...foyer,
                        adultes: foyer.adultes.filter(
                          (item) => item.id_personne !== adult.id_personne
                        )
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
          onClick={() =>
            set({ ...foyer, adultes: [...foyer.adultes, blankAdult(nextPersonId(foyer))] })
          }
        >
          Ajouter un adulte
        </AddButton>
      </FieldSet>

      {foyer.adultes.map((adult, index) => (
        <Solidarity
          key={adult.id_personne}
          index={index}
          adult={adult}
          onChange={(patch) => updateAdult(index, patch)}
        />
      ))}

      <FieldSet>
        <FieldLegend variant="legend">Enfants</FieldLegend>
        <FieldDescription>Toutes les personnes mineures du foyer.</FieldDescription>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-col-16" />
            <col className="w-col-16" />
            <col className="w-col-18" />
            <col className="w-col-20" />
            <col className="w-col-22" />
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
            {foyer.enfants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <span className="text-muted-foreground">Aucun enfant renseigné.</span>
                </TableCell>
              </TableRow>
            ) : (
              foyer.enfants.map((child, index) => (
                <TableRow key={child.id_personne}>
                  <Identity
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
                      label="Mode de résidence"
                      value={child.mode_residence}
                      options={RESIDENCE_MODES}
                      onValueChange={(mode_residence) => updateChild(index, { mode_residence })}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <RemoveButton
                      label={`Retirer ${child.prenom ?? ''} ${child.nom ?? ''}`.trim()}
                      onClick={() =>
                        set({
                          ...foyer,
                          enfants: foyer.enfants.filter(
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
            set({ ...foyer, enfants: [...foyer.enfants, blankChild(nextPersonId(foyer))] })
          }
        >
          Ajouter un enfant
        </AddButton>
      </FieldSet>
    </Section>
  )
}

function Solidarity({
  index,
  adult,
  onChange
}: {
  index: number
  adult: Adult
  onChange: (patch: Partial<Adult>) => void
}) {
  const name = [adult.prenom, adult.nom].filter(Boolean).join(' ') || `Adulte ${index + 1}`
  const mail = adult.adresse_correspondance
  return (
    <FieldSet>
      <FieldLegend variant="legend">Solidarité — {name}</FieldLegend>
      <FieldDescription>
        La date de fin de solidarité est proposée à partir du congé. Vous pouvez la modifier.
      </FieldDescription>
      <Rows>
        <Row
          title="Adresse de correspondance"
          description="À renseigner si la personne n’habite plus le logement."
        >
          <CodeSelect
            label="Adresse de correspondance"
            value={mail ? 'oui' : 'non'}
            options={[
              ['oui', 'Oui'],
              ['non', 'Non']
            ]}
            onValueChange={(next) =>
              onChange({ adresse_correspondance: next === 'oui' ? (mail ?? blankAddress()) : null })
            }
          />
        </Row>
        {mail ? (
          <>
            <Row title="Adresse" htmlFor={`correspondance_${index}_adresse`}>
              <Input
                id={`correspondance_${index}_adresse`}
                {...textField(mail.adresse, (adresse) =>
                  onChange({ adresse_correspondance: { ...mail, adresse } })
                )}
              />
            </Row>
            <Row title="Code postal" htmlFor={`correspondance_${index}_code_postal`}>
              <Input
                id={`correspondance_${index}_code_postal`}
                {...textField(mail.code_postal, (code_postal) =>
                  onChange({ adresse_correspondance: { ...mail, code_postal } })
                )}
              />
            </Row>
            <Row title="Commune" htmlFor={`correspondance_${index}_commune`}>
              <Input
                id={`correspondance_${index}_commune`}
                {...textField(mail.commune, (commune) =>
                  onChange({ adresse_correspondance: { ...mail, commune } })
                )}
              />
            </Row>
          </>
        ) : null}
        <Row title="Effet du congé" htmlFor={`conge_${index}`}>
          <DateField
            id={`conge_${index}`}
            value={adult.date_effet_conge}
            onChange={(date_effet_conge) => onChange({ date_effet_conge })}
          />
        </Row>
        <Row
          title="Remplacement par un cotitulaire"
          description="Oui si un nouveau cotitulaire entre au bail à la place de cette personne."
          htmlFor={`remplacement_${index}`}
        >
          <CodeSelect
            id={`remplacement_${index}`}
            label="Remplacement"
            value={adult.remplacement_cotitulaire}
            options={YES_NO}
            onValueChange={(remplacement_cotitulaire) => {
              if (remplacement_cotitulaire) onChange({ remplacement_cotitulaire })
            }}
          />
        </Row>
        {adult.remplacement_cotitulaire === 'oui' ? (
          <Row title="Entrée du nouveau cotitulaire" htmlFor={`entree_${index}`}>
            <DateField
              id={`entree_${index}`}
              value={adult.date_entree_nouveau_cotitulaire}
              onChange={(date_entree_nouveau_cotitulaire) =>
                onChange({ date_entree_nouveau_cotitulaire })
              }
            />
          </Row>
        ) : null}
        <Row
          title="Fin de solidarité"
          description="Date proposée, modifiable."
          htmlFor={`solidarite_${index}`}
        >
          <DateField
            id={`solidarite_${index}`}
            value={adult.date_fin_solidarite}
            onChange={(date_fin_solidarite) => onChange({ date_fin_solidarite })}
          />
        </Row>
      </Rows>
    </FieldSet>
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

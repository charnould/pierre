import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'

import { AIDS, type CaseFile, type SocialWorker } from '../document'
import { Chips, DateField, Detail, Row, Rows, Section, textField, YesNo } from '../form'

const EMPTY: SocialWorker = {
  prenom_et_nom: null,
  organisme: null,
  coordonnees: null,
  date_dernier_contact_avec_le_bailleur: null,
  date_dernier_contact_avec_le_locataire: null
}

export function Support({
  value,
  onChange
}: {
  value: CaseFile['accompagnement']
  onChange: (value: CaseFile['accompagnement']) => void
}) {
  const social = value.travailleur_social

  return (
    <Section id="diagnostic" title="Accompagnement">
      <Rows>
        <YesNo
          id="visite_a_domicile"
          title="Visite à domicile"
          description="Indiquez si les services ont rencontré le locataire à son domicile."
          checked={value.visite_a_domicile}
          onCheckedChange={(visite_a_domicile) => onChange({ ...value, visite_a_domicile })}
        />
        <YesNo
          id="travailleur_social"
          title="Travailleur social"
          description="Indiquez si un travailleur social référent a d'ores et déjà été identifié."
          checked={social != null}
          controls="travailleur_social_details"
          onCheckedChange={(enabled) =>
            onChange({ ...value, travailleur_social: enabled ? { ...EMPTY } : null })
          }
        />
        {social ? (
          <Detail id="travailleur_social_details" label="Informations sur le travailleur social">
            <Row
              title="Nom"
              description="Prénom et nom."
              htmlFor="travailleur_social_prenom_et_nom"
            >
              <Input
                id="travailleur_social_prenom_et_nom"
                placeholder="Prénom et nom"
                {...textField(social.prenom_et_nom, (name) =>
                  onChange({ ...value, travailleur_social: { ...social, prenom_et_nom: name } })
                )}
              />
            </Row>
            <Row
              title="Structure"
              description="Organisme ou service de rattachement."
              htmlFor="travailleur_social_organisme"
            >
              <Input
                id="travailleur_social_organisme"
                placeholder="Organisme"
                {...textField(social.organisme, (organisme) =>
                  onChange({ ...value, travailleur_social: { ...social, organisme } })
                )}
              />
            </Row>
            <Row
              title="Coordonnées"
              description="Courriel ou téléphone."
              htmlFor="travailleur_social_coordonnees"
            >
              <Input
                id="travailleur_social_coordonnees"
                placeholder="courriel ou téléphone"
                {...textField(social.coordonnees, (coordonnees) =>
                  onChange({ ...value, travailleur_social: { ...social, coordonnees } })
                )}
              />
            </Row>
            <Row
              title="Dernier contact avec le bailleur"
              description="Date du dernier échange entre le travailleur social et le bailleur."
              htmlFor="date_dernier_contact_avec_le_bailleur"
            >
              <DateField
                id="date_dernier_contact_avec_le_bailleur"
                value={social.date_dernier_contact_avec_le_bailleur}
                onChange={(date_dernier_contact_avec_le_bailleur) =>
                  onChange({
                    ...value,
                    travailleur_social: { ...social, date_dernier_contact_avec_le_bailleur }
                  })
                }
              />
            </Row>
            <Row
              title="Dernier contact avec le locataire"
              description="Date du dernier échange entre le travailleur social et le locataire en impayés."
              htmlFor="date_dernier_contact_avec_le_locataire"
            >
              <DateField
                id="date_dernier_contact_avec_le_locataire"
                value={social.date_dernier_contact_avec_le_locataire}
                onChange={(date_dernier_contact_avec_le_locataire) =>
                  onChange({
                    ...value,
                    travailleur_social: { ...social, date_dernier_contact_avec_le_locataire }
                  })
                }
              />
            </Row>
          </Detail>
        ) : null}
        <Row
          title="CCAPEX"
          description="Date de saisine de la commission de coordination des actions de prévention des expulsions. Laissez vide si elle n’a pas été saisie."
          htmlFor="date_saisine_ccapex_prevention_expulsions"
        >
          <DateField
            id="date_saisine_ccapex_prevention_expulsions"
            value={value.date_saisine_ccapex_prevention_expulsions}
            onChange={(date_saisine_ccapex_prevention_expulsions) =>
              onChange({ ...value, date_saisine_ccapex_prevention_expulsions })
            }
            empty="Non saisie"
          />
        </Row>
        <Row
          title="CTESI"
          description="Date de saisine de la commission technique d’examens de situations individuelles. Laissez vide si elle n’a pas été saisie."
          htmlFor="date_saisine_ctesi_situations_individuelles"
        >
          <DateField
            id="date_saisine_ctesi_situations_individuelles"
            value={value.date_saisine_ctesi_situations_individuelles}
            onChange={(date_saisine_ctesi_situations_individuelles) =>
              onChange({ ...value, date_saisine_ctesi_situations_individuelles })
            }
            empty="Non saisie"
          />
        </Row>
        <Row
          title="Aides mobilisables"
          description="Quelles aides sont possiblement mobilisables ?"
        >
          <Aids
            value={value.aides_mobilisables}
            onValueChange={(aides_mobilisables) => onChange({ ...value, aides_mobilisables })}
          />
        </Row>
      </Rows>
    </Section>
  )
}

function Aids({
  value,
  onValueChange
}: {
  value: string[]
  onValueChange: (value: string[]) => void
}) {
  const [catalog, setCatalog] = useState<string[]>([...AIDS])
  const [query, setQuery] = useState('')
  const typed = query.trim()
  const known = catalog.some((item) => item.toLocaleLowerCase() === typed.toLocaleLowerCase())
  const items = typed && !known ? [...catalog, typed] : catalog

  return (
    <Chips
      ariaLabel="Aides mobilisables"
      placeholder="Saisir ou choisir une aide"
      empty="Aucune aide"
      items={items}
      value={value}
      query={query}
      onQueryChange={setQuery}
      itemLabel={(item) => (catalog.includes(item) ? item : `Ajouter « ${item} »`)}
      onValueChange={(next) => {
        setCatalog((actuel) => {
          const extra = next.filter(
            (aide) => !actuel.some((item) => item.toLocaleLowerCase() === aide.toLocaleLowerCase())
          )
          return extra.length ? [...actuel, ...extra] : actuel
        })
        onValueChange(next)
      }}
    />
  )
}

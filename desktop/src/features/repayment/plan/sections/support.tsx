import { Input } from '@/shared/components/ui/input'

import type { CommonData, SocialWorker } from '../../../../../../shared/repayment-plan'
import { AIDS } from '../document'
import { CreatableChips, Detail, Row, Rows, Section, textField, YesNo } from '../form'

const EMPTY: SocialWorker = { prenom_et_nom: null, organisme: null, coordonnees: null }

export function Support({
  value,
  onChange
}: {
  value: CommonData
  onChange: (value: CommonData) => void
}) {
  const social = value.travailleur_social

  return (
    <Section id="accompagnement" title="Accompagnement">
      <Rows>
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
                {...textField(social.prenom_et_nom, (prenom_et_nom) =>
                  onChange({ ...value, travailleur_social: { ...social, prenom_et_nom } })
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
          </Detail>
        ) : null}
        <Row
          title="Aides mobilisables"
          description="Quelles aides sont possiblement mobilisables ?"
        >
          <CreatableChips
            ariaLabel="Aides mobilisables"
            placeholder="Saisir ou choisir une aide"
            empty="Aucune aide"
            suggestions={AIDS}
            value={value.aides_mobilisables}
            onValueChange={(aides_mobilisables) => onChange({ ...value, aides_mobilisables })}
          />
        </Row>
      </Rows>
    </Section>
  )
}

import {
  type CommonData,
  CONSENTS,
  EVICTION_RISKS,
  HOUSING_ORIENTATIONS,
  type SocialFinancialDiagnosis,
  type SocialWorker
} from '@pierre/shared/repayment-case-file'
import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'

import {
  bindNullableText,
  CodeSelect,
  ConditionalFields,
  CreatableChips,
  DateField,
  FieldRow,
  FieldRows,
  FormSection,
  MultiSelectChips,
  SwitchRow
} from './form-controls'

const VULNERABILITIES = [
  'Handicap',
  'Perte d’autonomie',
  'Troubles psychiques',
  'Addiction',
  'Personne âgée',
  'Isolement',
  'Famille monoparentale',
  'Violences intrafamiliales',
  'Illettrisme',
  'Absence de formation',
  'Barrière de la langue',
  'Non-recours aux droits',
  'Chômage long',
  'Logement inadapté',
  'Insalubrité',
  'Difficultés d’entretien du logement',
  'Sur-occupation',
  'Troubles de voisinage'
] as const

const MOBILIZABLE_AIDS = [
  'FSL',
  'Action Logement',
  'Secours catholique',
  'Ligue contre le cancer'
] as const

const EMPTY_WORKER: SocialWorker = {
  prenom_et_nom: null,
  organisme: null,
  coordonnees: null,
  date_premiere_rencontre: null
}

export function DiagnosisSection({
  common,
  onCommonChange,
  diagnosis,
  onDiagnosisChange
}: {
  common: CommonData
  onCommonChange: (patch: Partial<CommonData>) => void
  diagnosis: SocialFinancialDiagnosis
  onDiagnosisChange: (diagnosis: SocialFinancialDiagnosis) => void
}) {
  const [vulnerabilityQuery, setVulnerabilityQuery] = useState('')
  const [evictionQuery, setEvictionQuery] = useState('')
  const social = common.travailleur_social
  return (
    <FormSection id="diagnostic" title="Diagnostic social">
      <FieldRows>
        <FieldRow
          title="Consentement"
          description="Le ménage autorise-t-il les analyses et recherches nécessaires à la réalisation du diagnostic ?"
          htmlFor="consentement_recherche_pour_dsf"
        >
          <CodeSelect
            id="consentement_recherche_pour_dsf"
            label="Consentement"
            value={diagnosis.consentement_recherche_pour_dsf}
            options={CONSENTS}
            onValueChange={(consentement_recherche_pour_dsf) => {
              if (consentement_recherche_pour_dsf)
                onDiagnosisChange({ ...diagnosis, consentement_recherche_pour_dsf })
            }}
          />
        </FieldRow>
        <FieldRow
          title="Vulnérabilités"
          description="Quelles situations pèsent concrètement sur le maintien dans le logement ? Plusieurs réponses sont possibles."
          titleId="vulnerabilites"
        >
          <MultiSelectChips
            inputId="vulnerabilites_choix"
            labelledBy="vulnerabilites"
            placeholder="Choisir une vulnérabilité"
            empty="Aucune vulnérabilité"
            items={VULNERABILITIES}
            value={diagnosis.vulnerabilites}
            query={vulnerabilityQuery}
            onQueryChange={setVulnerabilityQuery}
            onValueChange={(vulnerabilites) => onDiagnosisChange({ ...diagnosis, vulnerabilites })}
          />
        </FieldRow>
        <FieldRow
          title="Risques en cas d’expulsion"
          description="Quels facteurs aggravent les conséquences d’une expulsion ? Plusieurs réponses sont possibles."
          titleId="risques_expulsion"
        >
          <MultiSelectChips
            inputId="risques_expulsion_choix"
            labelledBy="risques_expulsion"
            placeholder="Choisir un risque"
            empty="Aucun risque"
            items={EVICTION_RISKS}
            value={diagnosis.risques_expulsion}
            query={evictionQuery}
            onQueryChange={setEvictionQuery}
            onValueChange={(risques_expulsion) =>
              onDiagnosisChange({ ...diagnosis, risques_expulsion })
            }
          />
        </FieldRow>
        <FieldRow
          title="Aides mobilisables"
          description="Quelles aides sont possiblement mobilisables ?"
        >
          <CreatableChips
            inputId="aides_mobilisables_choix"
            ariaLabel="Aides mobilisables"
            placeholder="Saisir ou choisir une aide"
            empty="Aucune aide"
            suggestions={MOBILIZABLE_AIDS}
            value={common.aides_mobilisables}
            onValueChange={(aides_mobilisables) => onCommonChange({ aides_mobilisables })}
          />
        </FieldRow>
        <SwitchRow
          id="travailleur_social"
          title="Travailleur social"
          description="Un travailleur social référent a-t-il d'ores et déjà été identifié ?"
          checked={social != null}
          controls="travailleur_social_details"
          onCheckedChange={(enabled) =>
            onCommonChange({ travailleur_social: enabled ? { ...EMPTY_WORKER } : null })
          }
        />
        {social ? (
          <ConditionalFields
            id="travailleur_social_details"
            label="Informations sur le travailleur social"
          >
            <FieldRow
              title="Nom"
              description="Prénom et nom."
              htmlFor="travailleur_social_prenom_et_nom"
            >
              <Input
                id="travailleur_social_prenom_et_nom"
                placeholder="Prénom et nom"
                {...bindNullableText(social.prenom_et_nom, (prenom_et_nom) =>
                  onCommonChange({ travailleur_social: { ...social, prenom_et_nom } })
                )}
              />
            </FieldRow>
            <FieldRow
              title="Structure"
              description="Organisme ou service de rattachement."
              htmlFor="travailleur_social_organisme"
            >
              <Input
                id="travailleur_social_organisme"
                placeholder="Organisme"
                {...bindNullableText(social.organisme, (organisme) =>
                  onCommonChange({ travailleur_social: { ...social, organisme } })
                )}
              />
            </FieldRow>
            <FieldRow
              title="Coordonnées"
              description="Courriel ou téléphone."
              htmlFor="travailleur_social_coordonnees"
            >
              <Input
                id="travailleur_social_coordonnees"
                placeholder="courriel ou téléphone"
                {...bindNullableText(social.coordonnees, (coordonnees) =>
                  onCommonChange({ travailleur_social: { ...social, coordonnees } })
                )}
              />
            </FieldRow>
            <FieldRow
              title="Première rencontre avec le locataire"
              htmlFor="travailleur_social_date_premiere_rencontre"
            >
              <DateField
                id="travailleur_social_date_premiere_rencontre"
                value={social.date_premiere_rencontre}
                onChange={(date_premiere_rencontre) =>
                  onCommonChange({
                    travailleur_social: { ...social, date_premiere_rencontre }
                  })
                }
              />
            </FieldRow>
          </ConditionalFields>
        ) : null}
        <FieldRow
          title="Position du ménage"
          description="Ce que le ménage souhaite et ce qu’il propose."
          htmlFor="position_menage"
        >
          <Textarea
            id="position_menage"
            {...bindNullableText(diagnosis.position_et_solutions_proposees_par_menage, (position) =>
              onDiagnosisChange({
                ...diagnosis,
                position_et_solutions_proposees_par_menage: position
              })
            )}
          />
        </FieldRow>
        <FieldRow
          title="Observations du bailleur"
          description="Impact sur le logement, motifs de l’orientation, plan proposé et synthèse."
          htmlFor="observations_bailleur"
        >
          <Textarea
            id="observations_bailleur"
            {...bindNullableText(diagnosis.observations_bailleur, (observations_bailleur) =>
              onDiagnosisChange({ ...diagnosis, observations_bailleur })
            )}
          />
        </FieldRow>
        <FieldRow
          title="Orientation"
          description="Quelle suite donner au logement du ménage : maintien, mutation, relogement ou départ ?"
          htmlFor="orientation"
        >
          <CodeSelect
            id="orientation"
            label="Orientation"
            value={diagnosis.orientation_logement.orientation}
            options={HOUSING_ORIENTATIONS}
            onValueChange={(orientation) => {
              if (orientation) {
                onDiagnosisChange({
                  ...diagnosis,
                  orientation_logement: { ...diagnosis.orientation_logement, orientation }
                })
              }
            }}
          />
        </FieldRow>
      </FieldRows>
    </FormSection>
  )
}

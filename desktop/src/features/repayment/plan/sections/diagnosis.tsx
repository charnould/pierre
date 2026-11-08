import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'

import {
  CONSENTS,
  DIAGNOSIS_SIGNATURES,
  HOUSING_ORIENTATIONS,
  SCHEDULE_ASSESSMENTS,
  type SocialFinancialDiagnosis,
  YES_NO
} from '../../../../../../shared/repayment-plan'
import { CodeSelect, CreatableChips, Row, Rows, Section, textField } from '../form'

export function Diagnosis({
  value,
  onChange
}: {
  value: SocialFinancialDiagnosis
  onChange: (value: SocialFinancialDiagnosis) => void
}) {
  return (
    <Section id="diagnostic" title="Diagnostic social et financier">
      <Rows>
        <Row
          title="Ménage informé"
          description="Le ménage a-t-il été informé de la réalisation du diagnostic ?"
          htmlFor="menage_informe_du_dsf"
        >
          <CodeSelect
            id="menage_informe_du_dsf"
            label="Information du ménage"
            value={value.menage_informe_du_dsf}
            options={YES_NO}
            onValueChange={(menage_informe_du_dsf) => {
              if (menage_informe_du_dsf) onChange({ ...value, menage_informe_du_dsf })
            }}
          />
        </Row>
        <Row
          title="Consentement"
          description="Le ménage autorise-t-il les recherches nécessaires au diagnostic ?"
          htmlFor="consentement_recherche_pour_dsf"
        >
          <CodeSelect
            id="consentement_recherche_pour_dsf"
            label="Consentement"
            value={value.consentement_recherche_pour_dsf}
            options={CONSENTS}
            onValueChange={(consentement_recherche_pour_dsf) => {
              if (consentement_recherche_pour_dsf)
                onChange({ ...value, consentement_recherche_pour_dsf })
            }}
          />
        </Row>
        <Row title="Signature du ménage" htmlFor="signature_diagnostic_par_menage">
          <CodeSelect
            id="signature_diagnostic_par_menage"
            label="Signature"
            value={value.signature_diagnostic_par_menage}
            options={DIAGNOSIS_SIGNATURES}
            onValueChange={(signature_diagnostic_par_menage) => {
              if (signature_diagnostic_par_menage)
                onChange({ ...value, signature_diagnostic_par_menage })
            }}
          />
        </Row>
        <Row
          wide
          title="Position du ménage"
          description="Ce que le ménage souhaite et ce qu’il propose."
          htmlFor="position_menage"
        >
          <Textarea
            id="position_menage"
            {...textField(value.position_et_solutions_proposees_par_menage, (position) =>
              onChange({ ...value, position_et_solutions_proposees_par_menage: position })
            )}
          />
        </Row>
        <Row wide title="Observations du bailleur" htmlFor="observations_bailleur">
          <Textarea
            id="observations_bailleur"
            {...textField(value.observations_bailleur, (observations_bailleur) =>
              onChange({ ...value, observations_bailleur })
            )}
          />
        </Row>
        <Row
          title="Vulnérabilités"
          description="Situations qui pèsent concrètement sur le maintien dans le logement."
          titleId="vulnerabilites"
        >
          <CreatableChips
            labelledBy="vulnerabilites"
            placeholder="Ajouter une vulnérabilité"
            empty="Aucune vulnérabilité"
            suggestions={[]}
            value={value.vulnerabilites}
            onValueChange={(vulnerabilites) => onChange({ ...value, vulnerabilites })}
          />
        </Row>
        <Row wide title="Impact sur le logement" htmlFor="impact_vulnerabilites">
          <Textarea
            id="impact_vulnerabilites"
            {...textField(value.impact_vulnerabilites, (impact_vulnerabilites) =>
              onChange({ ...value, impact_vulnerabilites })
            )}
          />
        </Row>
        <Row title="Orientation" htmlFor="orientation">
          <CodeSelect
            id="orientation"
            label="Orientation"
            value={value.orientation_logement.orientation}
            options={HOUSING_ORIENTATIONS}
            onValueChange={(orientation) => {
              if (orientation) {
                onChange({
                  ...value,
                  orientation_logement: { ...value.orientation_logement, orientation }
                })
              }
            }}
          />
        </Row>
        <Row title="Motifs de l’orientation" htmlFor="motifs_orientation">
          <Input
            id="motifs_orientation"
            {...textField(value.orientation_logement.motifs, (motifs) =>
              onChange({
                ...value,
                orientation_logement: { ...value.orientation_logement, motifs }
              })
            )}
          />
        </Row>
        <Row
          title="Échéancier proposé"
          description="Dites si la proposition ci-dessous est soutenable pour le ménage."
          htmlFor="appreciation_echeancier"
        >
          <CodeSelect
            id="appreciation_echeancier"
            label="Appréciation"
            value={value.appreciation_echeancier}
            options={SCHEDULE_ASSESSMENTS}
            onValueChange={(appreciation_echeancier) => {
              if (!appreciation_echeancier) return
              onChange({
                ...value,
                appreciation_echeancier,
                motif_non_soutenabilite:
                  appreciation_echeancier === 'non_soutenable'
                    ? value.motif_non_soutenabilite
                    : null
              })
            }}
          />
        </Row>
        {value.appreciation_echeancier === 'non_soutenable' ? (
          <Row title="Pourquoi ce n’est pas soutenable" htmlFor="motif_non_soutenabilite">
            <Input
              id="motif_non_soutenabilite"
              {...textField(value.motif_non_soutenabilite, (motif_non_soutenabilite) =>
                onChange({ ...value, motif_non_soutenabilite })
              )}
            />
          </Row>
        ) : null}
        <Row wide title="Synthèse" htmlFor="synthese_professionnelle">
          <Textarea
            id="synthese_professionnelle"
            {...textField(value.synthese_professionnelle, (synthese_professionnelle) =>
              onChange({ ...value, synthese_professionnelle })
            )}
          />
        </Row>
      </Rows>
    </Section>
  )
}

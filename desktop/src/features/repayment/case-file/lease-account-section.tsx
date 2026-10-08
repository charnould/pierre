import {
  BANQUE_DE_FRANCE_SITUATIONS,
  type CommonData,
  CONTEST_MOTIVES,
  CONTEST_STATUSES,
  type DebtWithdrawal,
  type Guarantor
} from '@pierre/shared/repayment-case-file'
import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'

import {
  bindNullableText,
  CodeSelect,
  ConditionalFields,
  DateField,
  EuroInput,
  FieldRow,
  FieldRows,
  FormSection,
  MultiSelectChips,
  SwitchRow
} from './form-controls'

const EMPTY_GUARANTOR: Guarantor = { prenom_et_nom: null, coordonnees: null }
const EMPTY_WITHDRAWAL: DebtWithdrawal = {
  montant_en_euros: null,
  en_cours_de_regularisation: false
}
const ARREARS_MOTIVES = [
  'Perte d’emploi',
  'Crédit à la consommation',
  'Séparation',
  'Deuil',
  'Fin du titre de séjour',
  'Frais médicaux',
  'Frais de réparation du véhicule',
  'Modification de la composition familiale',
  'Maladie',
  'Dépendance administrative et budgétaire',
  'Mauvaise gestion',
  'Violence conjugale',
  'SLS',
  'Addiction'
] as const

export function LeaseAccountSection({
  common,
  onCommonChange
}: {
  common: CommonData
  onCommonChange: (patch: Partial<CommonData>) => void
}) {
  const [arrearsQuery, setArrearsQuery] = useState('')
  const [contestQuery, setContestQuery] = useState('')
  const lease = common.bail
  const account = common.compte_locataire
  const guarantor = lease.garant
  const withdrawal = lease.retrait_dettes
  const patchLease = (patch: Partial<CommonData['bail']>) =>
    onCommonChange({ bail: { ...lease, ...patch } })
  const patchAccount = (patch: Partial<CommonData['compte_locataire']>) =>
    onCommonChange({ compte_locataire: { ...account, ...patch } })

  return (
    <FormSection id="bail" title="Bail et compte locataire">
      <FieldRows>
        <FieldRow
          title="Début du bail"
          description="Date de prise d’effet du bail."
          htmlFor="debut_bail"
        >
          <DateField
            id="debut_bail"
            value={lease.debut_bail}
            onChange={(debut_bail) => patchLease({ debut_bail })}
            captionLayout="dropdown"
          />
        </FieldRow>
        <SwitchRow
          id="garant"
          title="Garant"
          description="Indiquer si un garant a été identifié."
          checked={guarantor != null}
          controls="garant_details"
          onCheckedChange={(enabled) =>
            patchLease({ garant: enabled ? { ...EMPTY_GUARANTOR } : null })
          }
        />
        {guarantor ? (
          <ConditionalFields id="garant_details" label="Informations sur le garant">
            <FieldRow title="Prénom et nom" htmlFor="garant_prenom_et_nom">
              <Input
                id="garant_prenom_et_nom"
                placeholder="Prénom et nom"
                {...bindNullableText(guarantor.prenom_et_nom, (prenom_et_nom) =>
                  patchLease({ garant: { ...guarantor, prenom_et_nom } })
                )}
              />
            </FieldRow>
            <FieldRow title="Coordonnées" htmlFor="garant_coordonnees">
              <Input
                id="garant_coordonnees"
                placeholder="Téléphone ou courriel"
                {...bindNullableText(guarantor.coordonnees, (coordonnees) =>
                  patchLease({ garant: { ...guarantor, coordonnees } })
                )}
              />
            </FieldRow>
          </ConditionalFields>
        ) : null}
        <SwitchRow
          id="retrait_dettes"
          title="Retrait de dettes"
          description="Le titulaire a-t-il fait l’objet d’une procédure de rétablissement personnel (PRP) ou d’une admission en non-valeur (ANV) sur le précédent contrat ?"
          checked={withdrawal != null}
          controls="retrait_dettes_details"
          onCheckedChange={(enabled) =>
            patchLease({ retrait_dettes: enabled ? { ...EMPTY_WITHDRAWAL } : null })
          }
        />
        {withdrawal ? (
          <ConditionalFields id="retrait_dettes_details" label="Retrait de dettes">
            <FieldRow title="Montant" htmlFor="retrait_dettes_montant">
              <EuroInput
                id="retrait_dettes_montant"
                value={withdrawal.montant_en_euros}
                onChange={(montant_en_euros) =>
                  patchLease({ retrait_dettes: { ...withdrawal, montant_en_euros } })
                }
              />
            </FieldRow>
            <SwitchRow
              id="retrait_dettes_regularisation"
              title="En cours de régularisation"
              description="Indiquez si cette PRP ou cette ANV est en cours de régularisation."
              checked={withdrawal.en_cours_de_regularisation}
              onCheckedChange={(en_cours_de_regularisation) =>
                patchLease({ retrait_dettes: { ...withdrawal, en_cours_de_regularisation } })
              }
            />
          </ConditionalFields>
        ) : null}
        <FieldRow
          title="Ancienne dette locative"
          description="Montant restant dû sur un ancien logement, hors du solde courant. Saisissez 0 s’il n’y en a pas."
          htmlFor="ancienne_dette_hors_solde_en_euros"
        >
          <EuroInput
            id="ancienne_dette_hors_solde_en_euros"
            label="Ancienne dette locative"
            value={account.ancienne_dette_hors_solde_en_euros}
            onChange={(ancienne_dette_hors_solde_en_euros) =>
              patchAccount({ ancienne_dette_hors_solde_en_euros })
            }
          />
        </FieldRow>
        <SwitchRow
          id="contentieux_anterieur"
          title="Précédente procédure de contentieux"
          description="Indiquer si une procédure contentieuse a déjà concerné le présent contrat."
          checked={lease.contentieux_anterieur}
          onCheckedChange={(contentieux_anterieur) => patchLease({ contentieux_anterieur })}
        />
        <FieldRow
          title="Solde du compte"
          description="Montant signé à la date d’arrêté. Un montant positif est une dette envers le bailleur, un montant négatif est un crédit du locataire."
          htmlFor="solde_compte_en_euros"
        >
          <div className="flex items-center justify-end gap-2">
            <EuroInput
              id="solde_compte_en_euros"
              signed
              value={account.solde_compte_en_euros}
              onChange={(solde_compte_en_euros) => patchAccount({ solde_compte_en_euros })}
            />
            <span>en date du</span>
            <DateField
              id="date_arrete_compte"
              label="Date d’arrêté"
              value={account.date_arrete_compte}
              onChange={(date_arrete_compte) => patchAccount({ date_arrete_compte })}
            />
          </div>
        </FieldRow>
        <FieldRow
          title="Contestation"
          description="Indiquer si une partie de la dette actuelle est contestée."
          htmlFor="statut_contestation"
        >
          <CodeSelect
            id="statut_contestation"
            label="Contestation"
            value={account.statut_contestation}
            options={CONTEST_STATUSES}
            onValueChange={(statut_contestation) => {
              if (statut_contestation === 'non_conteste') {
                patchAccount({
                  statut_contestation,
                  montant_conteste_en_euros: 0,
                  motifs_contestation: []
                })
              } else if (statut_contestation === 'inconnu') {
                patchAccount({
                  statut_contestation,
                  montant_conteste_en_euros: null,
                  motifs_contestation: []
                })
              } else if (statut_contestation === 'conteste') {
                patchAccount({ statut_contestation })
              }
            }}
          />
        </FieldRow>
        {account.statut_contestation === 'conteste' ? (
          <ConditionalFields id="contestation_details" label="Contestation">
            <FieldRow
              title="Montant contesté"
              description="Partie de la dette que le ménage conteste."
              htmlFor="montant_conteste_en_euros"
            >
              <EuroInput
                id="montant_conteste_en_euros"
                value={account.montant_conteste_en_euros}
                onChange={(montant_conteste_en_euros) =>
                  patchAccount({ montant_conteste_en_euros })
                }
              />
            </FieldRow>
            <FieldRow
              title="Motif de la contestation"
              description="Indiquer les motifs de la contestation. Plusieurs réponses sont possibles."
              titleId="motifs_contestation"
            >
              <MultiSelectChips
                inputId="motifs_contestation_choix"
                labelledBy="motifs_contestation"
                placeholder="Choisir un motif"
                empty="Aucun motif"
                items={CONTEST_MOTIVES}
                value={account.motifs_contestation}
                query={contestQuery}
                onQueryChange={setContestQuery}
                onValueChange={(motifs_contestation) => patchAccount({ motifs_contestation })}
              />
            </FieldRow>
          </ConditionalFields>
        ) : null}
        <FieldRow
          title="Premier impayé"
          description="Date du premier loyer qui n’a pas été réglé."
          htmlFor="date_premier_loyer_impaye"
        >
          <DateField
            id="date_premier_loyer_impaye"
            value={account.date_premier_loyer_impaye}
            onChange={(date_premier_loyer_impaye) => patchAccount({ date_premier_loyer_impaye })}
          />
        </FieldRow>
        <FieldRow
          title="Motif de l’impayé"
          description="Indiquer les motifs de l’impayé. Plusieurs réponses sont possibles."
          titleId="motifs_impaye"
        >
          <MultiSelectChips
            inputId="motifs_impaye_choix"
            labelledBy="motifs_impaye"
            placeholder="Choisir un motif"
            empty="Aucun motif"
            items={ARREARS_MOTIVES}
            value={account.motifs_impaye}
            query={arrearsQuery}
            onQueryChange={setArrearsQuery}
            onValueChange={(motifs_impaye) => patchAccount({ motifs_impaye })}
          />
        </FieldRow>
        <FieldRow
          title="Quelle est la situation « Banque de France » du locataire ?"
          description="Procédure de surendettement auprès de la Banque de France."
          htmlFor="situation_banque_de_france"
        >
          <CodeSelect
            id="situation_banque_de_france"
            label="Situation Banque de France"
            value={lease.situation_banque_de_france}
            options={BANQUE_DE_FRANCE_SITUATIONS}
            onValueChange={(situation_banque_de_france) => {
              if (!situation_banque_de_france) return
              patchLease({
                situation_banque_de_france,
                date_fin_moratoire:
                  situation_banque_de_france === 'moratoire' ? lease.date_fin_moratoire : null
              })
            }}
          />
        </FieldRow>
        {lease.situation_banque_de_france === 'moratoire' ? (
          <ConditionalFields id="moratoire_details" label="Moratoire">
            <FieldRow
              title="Date de fin du moratoire"
              description="Date à laquelle le moratoire Banque de France prend fin."
              htmlFor="date_fin_moratoire"
            >
              <DateField
                id="date_fin_moratoire"
                value={lease.date_fin_moratoire}
                onChange={(date_fin_moratoire) => patchLease({ date_fin_moratoire })}
              />
            </FieldRow>
          </ConditionalFields>
        ) : null}
      </FieldRows>
    </FormSection>
  )
}

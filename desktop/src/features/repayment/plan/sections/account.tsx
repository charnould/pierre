import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'

import { type CommonData, CONTEST_STATUSES } from '../../../../../../shared/repayment-plan'
import { MOTIVES } from '../document'
import { Chips, CodeSelect, DateField, Euros, Row, Rows, Section, textField } from '../form'

export function Account({
  value,
  onChange
}: {
  value: CommonData
  onChange: (value: CommonData) => void
}) {
  const [query, setQuery] = useState('')
  const compte = value.compte_locataire
  const set = (patch: Partial<CommonData['compte_locataire']>) =>
    onChange({ ...value, compte_locataire: { ...compte, ...patch } })

  return (
    <Section id="compte" title="Compte locataire">
      <Rows>
        <Row
          title="Solde du compte"
          description="Montant signé à la date d’arrêté. Un montant positif est une dette envers le bailleur, un montant négatif est un crédit du locataire."
          htmlFor="solde_compte_en_euros"
        >
          <Euros
            id="solde_compte_en_euros"
            signed
            value={compte.solde_compte_en_euros}
            onChange={(solde_compte_en_euros) => set({ solde_compte_en_euros })}
          />
        </Row>
        <Row
          title="Date d’arrêté"
          description="Date du solde utilisé pour le dossier."
          htmlFor="date_arrete_compte"
        >
          <DateField
            id="date_arrete_compte"
            value={compte.date_arrete_compte}
            onChange={(date_arrete_compte) => set({ date_arrete_compte })}
          />
        </Row>
        <Row
          title="Premier impayé"
          description="Date du premier loyer qui n’a pas été réglé."
          htmlFor="date_premier_loyer_impaye"
        >
          <DateField
            id="date_premier_loyer_impaye"
            value={compte.date_premier_loyer_impaye}
            onChange={(date_premier_loyer_impaye) => set({ date_premier_loyer_impaye })}
          />
        </Row>
        <Row
          title="Contestation"
          description="Indiquez si une partie de la dette est contestée."
          htmlFor="statut_contestation"
        >
          <CodeSelect
            id="statut_contestation"
            label="Contestation"
            value={compte.statut_contestation}
            options={CONTEST_STATUSES}
            onValueChange={(statut_contestation) => {
              if (statut_contestation === 'non_conteste') {
                set({
                  statut_contestation,
                  montant_conteste_en_euros: 0,
                  motif_contestation: null
                })
              } else if (statut_contestation === 'inconnu') {
                set({
                  statut_contestation,
                  montant_conteste_en_euros: null,
                  motif_contestation: null
                })
              } else if (statut_contestation === 'conteste') {
                set({ statut_contestation })
              }
            }}
          />
        </Row>
        {compte.statut_contestation === 'conteste' ? (
          <>
            <Row
              title="Montant contesté"
              description="Partie de la dette que le ménage conteste."
              htmlFor="montant_conteste_en_euros"
            >
              <Euros
                id="montant_conteste_en_euros"
                value={compte.montant_conteste_en_euros}
                onChange={(montant_conteste_en_euros) => set({ montant_conteste_en_euros })}
              />
            </Row>
            <Row
              title="Motif de la contestation"
              description="Décrivez ce que le ménage conteste."
              htmlFor="motif_contestation"
            >
              <Input
                id="motif_contestation"
                placeholder="Motif"
                {...textField(compte.motif_contestation, (motif_contestation) =>
                  set({ motif_contestation })
                )}
              />
            </Row>
          </>
        ) : null}
        <Row
          title="Motif de l’impayé"
          description="Choisissez les causes de l’impayé. Plusieurs réponses sont possibles."
          titleId="motifs_impaye"
        >
          <Chips
            labelledBy="motifs_impaye"
            placeholder="Choisir un motif"
            empty="Aucun motif"
            items={MOTIVES}
            value={compte.motifs_impaye}
            query={query}
            onQueryChange={setQuery}
            onValueChange={(motifs_impaye) => set({ motifs_impaye })}
          />
        </Row>
        <Row
          title="Ancienne dette locative"
          description="Montant restant dû sur un ancien logement, hors du solde courant. Saisissez 0 s’il n’y en a pas."
          htmlFor="ancienne_dette_hors_solde_en_euros"
        >
          <Euros
            id="ancienne_dette_hors_solde_en_euros"
            label="Ancienne dette locative"
            value={compte.ancienne_dette_hors_solde_en_euros}
            onChange={(ancienne_dette_hors_solde_en_euros) =>
              set({ ancienne_dette_hors_solde_en_euros })
            }
          />
        </Row>
      </Rows>
    </Section>
  )
}

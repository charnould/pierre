import { useState } from 'react'

import { type CaseFile, MOTIVES } from '../document'
import { Chips, DateField, Euros, Row, Rows, Section } from '../form'

export function Debt({
  value,
  onChange
}: {
  value: CaseFile['dette']
  onChange: (value: CaseFile['dette']) => void
}) {
  const [query, setQuery] = useState('')

  return (
    <Section id="financier" title="Dette">
      <Rows>
        <Row
          title="Dette locative"
          description="Montant restant dû à ce jour, en euros."
          htmlFor="montant_restant_du_euros"
        >
          <Euros
            id="montant_restant_du_euros"
            value={value.montant_restant_du_euros}
            onChange={(montant_restant_du_euros) =>
              onChange({ ...value, montant_restant_du_euros })
            }
          />
        </Row>
        <Row
          title="Premier impayé"
          description="Date du premier loyer qui n’a pas été réglé."
          htmlFor="date_premier_loyer_impaye"
        >
          <DateField
            id="date_premier_loyer_impaye"
            value={value.date_premier_loyer_impaye}
            onChange={(date_premier_loyer_impaye) =>
              onChange({ ...value, date_premier_loyer_impaye })
            }
          />
        </Row>
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
            value={value.motifs_impaye}
            query={query}
            onQueryChange={setQuery}
            onValueChange={(motifs_impaye) => onChange({ ...value, motifs_impaye })}
          />
        </Row>
        <Row
          title="Ancienne dette locative"
          description="Indiquez le montant restant dû sur un ancien logement. Saisissez 0 s’il n’y en a pas."
          htmlFor="ancienne_dette_locative_euros"
        >
          <Euros
            id="ancienne_dette_locative_euros"
            label="Ancienne dette locative"
            value={value.ancienne_dette_locative_euros}
            onChange={(ancienne_dette_locative_euros) =>
              onChange({ ...value, ancienne_dette_locative_euros })
            }
          />
        </Row>
      </Rows>
    </Section>
  )
}

import { BANK_OF_FRANCE, type CaseFile, STAGES } from '../document'
import { DateField, PairSelect, Row, Rows, Section } from '../form'

export function Procedure({
  value,
  onChange
}: {
  value: CaseFile['procedure']
  onChange: (value: CaseFile['procedure']) => void
}) {
  const dateTitle = STAGES.find(([stage]) => stage === value.stade)?.[1] ?? 'Date du stade'

  return (
    <Section id="procedure" title="Procédure">
      <Rows>
        <Row
          title="Stade de la procédure"
          description="À quel stade de la procédure d'impayés en est le locataire ?"
          htmlFor="stade"
        >
          <PairSelect
            id="stade"
            value={value.stade}
            onValueChange={(stade) => onChange({ ...value, stade })}
            options={STAGES}
          />
        </Row>
        <Row
          title={dateTitle}
          description="Date à laquelle ce stade a été atteint."
          htmlFor="date_du_stade"
        >
          <DateField
            id="date_du_stade"
            value={value.date_du_stade}
            onChange={(date_du_stade) => onChange({ ...value, date_du_stade })}
          />
        </Row>
        <Row
          title="Situation « Banque de France »"
          description="Indiquez si une procédure de surendettement a été initiée, et laquelle."
          htmlFor="situation_banque_de_france"
        >
          <PairSelect
            id="situation_banque_de_france"
            value={value.situation_banque_de_france}
            onValueChange={(situation_banque_de_france) =>
              onChange({ ...value, situation_banque_de_france })
            }
            options={BANK_OF_FRANCE}
          />
        </Row>
        {value.situation_banque_de_france === 'Moratoire' ? (
          <Row
            title="Fin du moratoire"
            description="Aucun règlement du plan ne doit être prévu avant cette date."
            htmlFor="date_fin_moratoire"
          >
            <DateField
              id="date_fin_moratoire"
              value={value.date_fin_moratoire}
              onChange={(date_fin_moratoire) => onChange({ ...value, date_fin_moratoire })}
            />
          </Row>
        ) : null}
      </Rows>
    </Section>
  )
}

import { PAYMENT_MODES, type SettlementPlan, YES_NO } from '../../../../../../shared/repayment-plan'
import { CodeSelect, DateField, Row, Rows, Section } from '../form'

export function Settlement({
  value,
  onChange
}: {
  value: SettlementPlan
  onChange: (value: SettlementPlan) => void
}) {
  const accepted = value.accord_bailleur === 'oui' && value.accord_menage === 'oui'
  return (
    <Section id="accords" title="Plan d’apurement">
      <Rows>
        <Row title="Accord du bailleur" htmlFor="accord_bailleur">
          <CodeSelect
            id="accord_bailleur"
            label="Accord du bailleur"
            value={value.accord_bailleur}
            options={YES_NO}
            onValueChange={(accord_bailleur) => {
              if (!accord_bailleur) return
              const both = accord_bailleur === 'oui' && value.accord_menage === 'oui'
              onChange({ ...value, accord_bailleur, date_accord: both ? value.date_accord : null })
            }}
          />
        </Row>
        <Row title="Accord du ménage" htmlFor="accord_menage">
          <CodeSelect
            id="accord_menage"
            label="Accord du ménage"
            value={value.accord_menage}
            options={YES_NO}
            onValueChange={(accord_menage) => {
              if (!accord_menage) return
              const both = value.accord_bailleur === 'oui' && accord_menage === 'oui'
              onChange({ ...value, accord_menage, date_accord: both ? value.date_accord : null })
            }}
          />
        </Row>
        {accepted ? (
          <Row title="Date d’accord" htmlFor="date_accord">
            <DateField
              id="date_accord"
              value={value.date_accord}
              onChange={(date_accord) => onChange({ ...value, date_accord })}
            />
          </Row>
        ) : null}
        <Row
          title="Paiement des échéances"
          description="Mode de règlement des mensualités du plan."
          htmlFor="mode_de_paiement_echeances"
        >
          <CodeSelect
            id="mode_de_paiement_echeances"
            label="Mode de paiement"
            value={value.mode_de_paiement_echeances}
            options={PAYMENT_MODES}
            onValueChange={(mode_de_paiement_echeances) =>
              onChange({ ...value, mode_de_paiement_echeances })
            }
          />
        </Row>
      </Rows>
    </Section>
  )
}

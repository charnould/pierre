import { Input } from '@/shared/components/ui/input'

import type { CommonData, Guarantor } from '../../../../../../shared/repayment-plan'
import { DateField, Detail, Row, Rows, Section, textField, YesNo } from '../form'

const EMPTY: Guarantor = { prenom: null, nom: null }

export function Lease({
  value,
  onChange
}: {
  value: CommonData
  onChange: (value: CommonData) => void
}) {
  const bail = value.bail
  const guarantor = bail.garant

  return (
    <Section id="bail" title="Bail">
      <Rows>
        <Row
          title="Début du bail"
          description="Date de prise d’effet du bail."
          htmlFor="debut_bail"
        >
          <DateField
            id="debut_bail"
            value={bail.debut_bail}
            onChange={(debut_bail) => onChange({ ...value, bail: { ...bail, debut_bail } })}
            captionLayout="dropdown"
          />
        </Row>
        <YesNo
          id="garant"
          title="Garant"
          description="Indiquez si un garant a été identifié."
          checked={guarantor != null}
          controls="garant_details"
          onCheckedChange={(enabled) =>
            onChange({ ...value, bail: { ...bail, garant: enabled ? { ...EMPTY } : null } })
          }
        />
        {guarantor ? (
          <Detail id="garant_details" label="Informations sur le garant">
            <Row title="Prénom" htmlFor="garant_prenom">
              <Input
                id="garant_prenom"
                placeholder="Prénom"
                {...textField(guarantor.prenom, (prenom) =>
                  onChange({ ...value, bail: { ...bail, garant: { ...guarantor, prenom } } })
                )}
              />
            </Row>
            <Row title="Nom" htmlFor="garant_nom">
              <Input
                id="garant_nom"
                placeholder="Nom"
                {...textField(guarantor.nom, (nom) =>
                  onChange({ ...value, bail: { ...bail, garant: { ...guarantor, nom } } })
                )}
              />
            </Row>
          </Detail>
        ) : null}
      </Rows>
    </Section>
  )
}

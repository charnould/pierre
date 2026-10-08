import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'

import type { CommonData } from '../../../../../../shared/repayment-plan'
import { Row, Rows, Section, textField } from '../form'

export function Identification({
  value,
  onChange
}: {
  value: CommonData
  onChange: (value: CommonData) => void
}) {
  const ids = value.identification
  const home = value.logement
  return (
    <Section id="identification" title="Identification">
      <Rows>
        <Row
          wide
          title="Identifiants"
          description="Renseignez l’identifiant du client, puis l’identifiant locataire (avec 1 client → N locataires)."
          titleId="identifiants"
        >
          <FieldSet>
            <FieldLegend className="sr-only">Identifiants</FieldLegend>
            <FieldGroup className="w-auto flex-row justify-end">
              <Field className="w-40 shrink-0">
                <FieldLabel htmlFor="id_client" className="sr-only">
                  Identifiant client
                </FieldLabel>
                <Input
                  id="id_client"
                  placeholder="Identifiant client"
                  {...textField(ids.id_client, (id_client) =>
                    onChange({ ...value, identification: { ...ids, id_client } })
                  )}
                />
              </Field>
              <Field className="w-40 shrink-0">
                <FieldLabel htmlFor="id_locataire" className="sr-only">
                  Identifiant locataire
                </FieldLabel>
                <Input
                  id="id_locataire"
                  placeholder="Identifiant locataire"
                  {...textField(ids.id_locataire, (id_locataire) =>
                    onChange({ ...value, identification: { ...ids, id_locataire } })
                  )}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </Row>
        <Row
          title="Logement"
          description="Renseignez l'identifiant du logement concerné."
          htmlFor="id_lot"
        >
          <Input
            id="id_lot"
            placeholder="Identifiant logement"
            {...textField(ids.id_lot, (id_lot) =>
              onChange({ ...value, identification: { ...ids, id_lot } })
            )}
          />
        </Row>
        <Row
          wide
          title="Adresse"
          description="Renseignez l'adresse du logement concerné."
          titleId="adresse"
        >
          <FieldSet>
            <FieldLegend className="sr-only">Adresse</FieldLegend>
            <FieldGroup className="w-auto flex-row justify-end">
              <Field className="w-64 shrink-0">
                <FieldLabel htmlFor="adresse" className="sr-only">
                  Adresse
                </FieldLabel>
                <Input
                  id="adresse"
                  placeholder="Adresse"
                  {...textField(home.adresse, (adresse) =>
                    onChange({ ...value, logement: { ...home, adresse } })
                  )}
                />
              </Field>
              <Field className="w-24 shrink-0">
                <FieldLabel htmlFor="code_postal" className="sr-only">
                  Code postal
                </FieldLabel>
                <Input
                  id="code_postal"
                  placeholder="84110"
                  inputMode="numeric"
                  {...textField(home.code_postal, (code_postal) =>
                    onChange({ ...value, logement: { ...home, code_postal } })
                  )}
                />
              </Field>
              <Field className="w-36 shrink-0">
                <FieldLabel htmlFor="commune" className="sr-only">
                  Commune
                </FieldLabel>
                <Input
                  id="commune"
                  placeholder="Commune"
                  {...textField(home.commune, (commune) =>
                    onChange({ ...value, logement: { ...home, commune } })
                  )}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </Row>
      </Rows>
    </Section>
  )
}

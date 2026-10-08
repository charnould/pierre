import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'

import type { CaseFile } from '../document'
import { Row, Rows, Section, textField } from '../form'

export function Identification({
  value,
  onChange
}: {
  value: CaseFile['identification']
  onChange: (value: CaseFile['identification']) => void
}) {
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
                <FieldLabel htmlFor="identifiant_client" className="sr-only">
                  Identifiant-client
                </FieldLabel>
                <Input
                  id="identifiant_client"
                  placeholder="Identifiant client"
                  {...textField(value.identifiant_client, (identifiant_client) =>
                    onChange({ ...value, identifiant_client })
                  )}
                />
              </Field>
              <Field className="w-40 shrink-0">
                <FieldLabel htmlFor="identifiant_locataire" className="sr-only">
                  Identifiant-locataire
                </FieldLabel>
                <Input
                  id="identifiant_locataire"
                  placeholder="Identifiant locataire"
                  {...textField(value.identifiant_locataire, (identifiant_locataire) =>
                    onChange({ ...value, identifiant_locataire })
                  )}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </Row>
        <Row
          title="Logement"
          description="Renseignez l'identifiant du logement concerné."
          htmlFor="identifiant_logement"
        >
          <Input
            id="identifiant_logement"
            placeholder="Identifiant logement"
            {...textField(value.identifiant_logement, (identifiant_logement) =>
              onChange({ ...value, identifiant_logement })
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
                <FieldLabel htmlFor="adresse_voie" className="sr-only">
                  Voie
                </FieldLabel>
                <Input
                  id="adresse_voie"
                  placeholder="Voie"
                  {...textField(value.adresse.voie, (voie) =>
                    onChange({ ...value, adresse: { ...value.adresse, voie } })
                  )}
                />
              </Field>
              <Field className="w-24 shrink-0">
                <FieldLabel htmlFor="adresse_code_postal" className="sr-only">
                  Code postal
                </FieldLabel>
                <Input
                  id="adresse_code_postal"
                  placeholder="84110"
                  inputMode="numeric"
                  {...textField(value.adresse.code_postal, (code_postal) =>
                    onChange({ ...value, adresse: { ...value.adresse, code_postal } })
                  )}
                />
              </Field>
              <Field className="w-36 shrink-0">
                <FieldLabel htmlFor="adresse_commune" className="sr-only">
                  Commune
                </FieldLabel>
                <Input
                  id="adresse_commune"
                  placeholder="Commune"
                  {...textField(value.adresse.commune, (commune) =>
                    onChange({ ...value, adresse: { ...value.adresse, commune } })
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

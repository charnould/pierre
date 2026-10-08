import type { CommonData } from '@pierre/shared/repayment-case-file'

import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'

import { bindNullableText, FieldRow, FieldRows, FormSection } from './form-controls'

export function IdentificationSection({
  common,
  tenantIdLocked = false,
  onCommonChange
}: {
  common: CommonData
  tenantIdLocked?: boolean
  onCommonChange: (patch: Partial<CommonData>) => void
}) {
  const identification = common.identification
  const housing = common.logement
  return (
    <FormSection id="identification" title="Identification">
      <FieldRows>
        <FieldRow
          wide
          title="Identifiants"
          description="Renseigner l’identifiant du client, puis l’identifiant locataire (avec 1 client → N locataires)."
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
                  {...bindNullableText(identification.id_client, (id_client) =>
                    onCommonChange({ identification: { ...identification, id_client } })
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
                  disabled={tenantIdLocked}
                  {...bindNullableText(identification.id_locataire, (id_locataire) =>
                    onCommonChange({ identification: { ...identification, id_locataire } })
                  )}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldRow>
        <FieldRow
          title="Logement"
          description="Renseigner l'identifiant du logement concerné."
          htmlFor="id_lot"
        >
          <Input
            id="id_lot"
            placeholder="Identifiant logement"
            {...bindNullableText(identification.id_lot, (id_lot) =>
              onCommonChange({ identification: { ...identification, id_lot } })
            )}
          />
        </FieldRow>
        <FieldRow
          wide
          title="Adresse"
          description="Renseigner l'adresse du logement concerné."
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
                  {...bindNullableText(housing.adresse, (adresse) =>
                    onCommonChange({ logement: { ...housing, adresse } })
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
                  {...bindNullableText(housing.code_postal, (code_postal) =>
                    onCommonChange({ logement: { ...housing, code_postal } })
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
                  {...bindNullableText(housing.commune, (commune) =>
                    onCommonChange({ logement: { ...housing, commune } })
                  )}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldRow>
      </FieldRows>
    </FormSection>
  )
}

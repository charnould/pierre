import { Input } from '@/shared/components/ui/input'

import type { CaseFile, Guarantor } from '../document'
import { DateField, Detail, Row, Rows, Section, textField, YesNo } from '../form'

const EMPTY: Guarantor = { prenom: null, nom: null }

export function Lease({
  value,
  onChange
}: {
  value: CaseFile['bail']
  onChange: (value: CaseFile['bail']) => void
}) {
  const guarantor = value.garant

  return (
    <Section id="bail" title="Bail">
      <Rows>
        <YesNo
          id="avenant_signe"
          title="Avenant au bail"
          description="Indiquez si un avenant au bail initial a été signé."
          checked={value.avenant_signe}
          onCheckedChange={(avenant_signe) => onChange({ ...value, avenant_signe })}
        />
        <Row
          title="Préavis de congé"
          description="Indiquez la date de dépôt du préavis de congé. Laissez vide s’il n’a pas été déposé."
          htmlFor="date_depot_preavis_conge"
        >
          <DateField
            id="date_depot_preavis_conge"
            value={value.date_depot_preavis_conge}
            onChange={(date_depot_preavis_conge) =>
              onChange({ ...value, date_depot_preavis_conge })
            }
            empty="Non déposé"
          />
        </Row>
        <YesNo
          id="contentieux_anterieur_sur_ce_contrat"
          title="Déjà passé en contentieux sur le contrat présent"
          description="Indiquez si une procédure contentieuse a déjà concerné ce contrat."
          checked={value.contentieux_anterieur_sur_ce_contrat}
          onCheckedChange={(contentieux_anterieur_sur_ce_contrat) =>
            onChange({ ...value, contentieux_anterieur_sur_ce_contrat })
          }
        />
        <YesNo
          id="garant"
          title="Garant"
          description="Indiquez si un garant a été identifié."
          checked={guarantor != null}
          controls="garant_details"
          onCheckedChange={(enabled) =>
            onChange({ ...value, garant: enabled ? { ...EMPTY } : null })
          }
        />
        {guarantor ? (
          <Detail id="garant_details" label="Informations sur le garant">
            <Row title="Prénom" htmlFor="garant_prenom">
              <Input
                id="garant_prenom"
                placeholder="Prénom"
                {...textField(guarantor.prenom, (firstName) =>
                  onChange({ ...value, garant: { ...guarantor, prenom: firstName } })
                )}
              />
            </Row>
            <Row title="Nom" htmlFor="garant_nom">
              <Input
                id="garant_nom"
                placeholder="Nom"
                {...textField(guarantor.nom, (lastName) =>
                  onChange({ ...value, garant: { ...guarantor, nom: lastName } })
                )}
              />
            </Row>
          </Detail>
        ) : null}
      </Rows>
    </Section>
  )
}

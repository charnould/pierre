import { describe, expect, test } from 'bun:test'

import type { TenantRepaymentRow } from './classify-tenants'
import {
  filterOutboundEmailTemplates,
  filterOutboundRcsTemplates,
  findOutboundTemplateById,
  groupOutboundTemplates,
  parseOutboundTemplate,
  resolveOutboundEmail,
  resolveOutboundRcs,
  templatesFromRawModules,
  type OutboundRcsTemplate
} from './outbound-email-templates'

const tenant = {
  id_locataire: 'LOC-1',
  id_client: 'CLI-1',
  solde_locataire: 120,
  email_client: 'locataire@example.org',
  telephone_client: '0601020304'
} satisfies TenantRepaymentRow

describe('parseOutboundTemplate', () => {
  test('parse un modèle mailto CAF valide', () => {
    const parsed = parseOutboundTemplate(`---
channel: mailto
id: caf_demande_apl
group: Courriel à la CAF
action: Contacter la CAF
to: caf
label: Demande APL
subject: Dossier {{id_locataire}}
email: caf@example.fr
---
Bonjour {{id_client}}.
`)
    expect(parsed).toEqual({
      channel: 'mailto',
      id: 'caf_demande_apl',
      group: 'Courriel à la CAF',
      action: 'Contacter la CAF',
      to: 'caf',
      label: 'Demande APL',
      subject: 'Dossier {{id_locataire}}',
      body: 'Bonjour {{id_client}}.',
      email: 'caf@example.fr'
    })
  })

  test('parse un modèle RCS JSON valide', () => {
    const parsed = parseOutboundTemplate(`{
  "channel": "rcs",
  "id": "locataire_sms_relance",
  "group": "SMS au locataire",
  "action": "Envoyer un SMS de relance",
  "label": "Relance",
  "body": "Bonjour {{id_locataire}}",
  "sms_fallback": "SMS {{id_locataire}}",
  "choices": [{ "type": "reply", "label": "Rappelez-moi" }]
}`)
    expect(parsed).toEqual({
      channel: 'rcs',
      id: 'locataire_sms_relance',
      group: 'SMS au locataire',
      action: 'Envoyer un SMS de relance',
      label: 'Relance',
      body: 'Bonjour {{id_locataire}}',
      sms_fallback: 'SMS {{id_locataire}}',
      choices: [{ type: 'reply', label: 'Rappelez-moi' }]
    })
  })

  test('rejette un frontmatter incomplet ou un id invalide', () => {
    expect(
      parseOutboundTemplate(`---
channel: email
id: Bad-Id
to: caf
label: X
subject: Y
---
Corps
`)
    ).toBeNull()
    expect(
      parseOutboundTemplate(`---
channel: rcs
label: Relance
---
Corps
`)
    ).toBeNull()
    expect(
      parseOutboundTemplate(`---
channel: rcs
---
Corps
`)
    ).toBeNull()
    expect(
      parseOutboundTemplate(`{
  "channel": "rcs",
  "id": "locataire_sms_relance",
  "action": "Envoyer un SMS de relance",
  "label": "Relance",
  "body": "Corps",
  "sms_fallback": "SMS",
  "choices": []
}`)
    ).toBeNull()
    expect(
      parseOutboundTemplate(`{
  "channel": "rcs",
  "id": "locataire_sms_relance",
  "group": "SMS au locataire",
  "label": "Relance",
  "body": "Corps",
  "sms_fallback": "SMS",
  "choices": []
}`)
    ).toBeNull()
    expect(
      parseOutboundTemplate(`---
channel: lettre
id: locataire_courrier
group: Courrier
action: Envoyer un courrier
label: Relance
---
Corps
`)
    ).toBeNull()
  })
})

describe('resolveOutboundEmail', () => {
  test('utilise email frontmatter pour CAF et substitue les placeholders', () => {
    const template = parseOutboundTemplate(`---
channel: mailto
id: caf_demande_apl
group: Courriel à la CAF
action: Contacter la CAF
to: caf
label: Demande APL
subject: Dossier {{id_locataire}}
email: caf@example.fr
---
Client {{id_client}} / {{email_client}} / {{telephone_client}}
`)
    expect(template?.channel).toBe('mailto')
    if (template?.channel !== 'mailto') return
    const resolved = resolveOutboundEmail(template, tenant)
    expect(resolved.templateId).toBe('caf_demande_apl')
    expect(resolved.to).toBe('caf')
    expect(resolved.toAddress).toBe('caf@example.fr')
    expect(resolved.subject).toBe('Dossier LOC-1')
    expect(resolved.body).toBe('Client CLI-1 / locataire@example.org / 0601020304')
    expect(resolved.mailtoUrl.startsWith('mailto:caf@example.fr?')).toBe(true)
    expect(resolved.mailtoUrl).toContain(`subject=${encodeURIComponent('Dossier LOC-1')}`)
    expect(resolved.mailtoUrl).not.toContain('subject=Dossier+LOC-1')
  })

  test('utilise email_client pour to=locataire, sinon vide', () => {
    const template = parseOutboundTemplate(`---
channel: email
id: locataire_email_relance
group: Courriel au locataire
action: Envoyer un e-mail de relance
to: locataire
label: Relance
subject: Objet
---
Corps
`)
    expect(template?.channel).toBe('email')
    if (template?.channel !== 'email') return
    expect(resolveOutboundEmail(template, tenant).toAddress).toBe('locataire@example.org')
    expect(
      resolveOutboundEmail(template, {
        ...tenant,
        email_client: null
      }).toAddress
    ).toBe('')
    expect(
      resolveOutboundEmail(template, {
        ...tenant,
        email_client: null
      }).mailtoUrl.startsWith('mailto:?')
    ).toBe(true)
  })
})

describe('resolveOutboundRcs', () => {
  test('substitue les placeholders', () => {
    const template = parseOutboundTemplate(`{
  "channel": "rcs",
  "id": "locataire_sms_relance",
  "group": "SMS au locataire",
  "action": "Envoyer un SMS de relance",
  "label": "Relance",
  "body": "Réf {{id_locataire}} / {{telephone_client}}",
  "sms_fallback": "SMS {{id_locataire}}",
  "choices": []
}`)
    expect(template?.channel).toBe('rcs')
    if (template?.channel !== 'rcs') return
    expect(resolveOutboundRcs(template, tenant)).toEqual({
      templateId: 'locataire_sms_relance',
      body: 'Réf LOC-1 / 0601020304',
      sms_fallback: 'SMS LOC-1',
      choices: []
    })
  })
})

describe('templatesFromRawModules', () => {
  test('charge et filtre un jeu de modèles inline', () => {
    const all = templatesFromRawModules({
      'caf_email_retablir_versement_apl.md': `---
channel: mailto
id: caf_email_retablir_versement_apl
to: caf
group: Courriel à la CAF
action: Contacter la CAF
label: Rétablir APL
subject: APL
---
Bonjour`,
      'locataire_email_relance_impaye.md': `---
channel: email
id: locataire_email_relance_impaye
to: locataire
group: Courriel au locataire
action: Relancer le locataire
label: Relance
subject: Impayé
---
Bonjour`,
      'locataire_rcs_relance_impaye.json': `{
  "channel": "rcs",
  "id": "locataire_rcs_relance_impaye",
  "group": "RCS/SMS au (ex-)client",
  "action": "Envoyer un RCS de relance",
  "label": "Relance",
  "body": "Réf {{id_locataire}}",
  "sms_fallback": "SMS {{id_locataire}}",
  "choices": []
}`
    })
    const caf = filterOutboundEmailTemplates(all, 'caf')
    const locataire = filterOutboundEmailTemplates(all, 'locataire')
    const sms = filterOutboundRcsTemplates(all)

    expect(caf).toHaveLength(1)
    expect(locataire).toHaveLength(1)
    expect(sms).toHaveLength(1)
    expect(caf.every((entry) => entry.to === 'caf')).toBe(true)
    expect(caf.every((entry) => entry.channel === 'mailto')).toBe(true)
    expect(locataire.every((entry) => entry.to === 'locataire')).toBe(true)
    expect(locataire.every((entry) => entry.channel === 'email')).toBe(true)
    expect(sms.every((entry) => entry.channel === 'rcs')).toBe(true)
    expect(all.every((entry) => /^[a-z][a-z0-9_]*$/.test(entry.id))).toBe(true)
    expect(findOutboundTemplateById(all, 'locataire_rcs_relance_impaye')?.channel).toBe('rcs')
    expect(findOutboundTemplateById(all, 'caf_email_retablir_versement_apl')?.channel).toBe(
      'mailto'
    )
    expect(findOutboundTemplateById(all, 'locataire_email_relance_impaye')?.channel).toBe('email')
    expect(all.every((entry) => entry.group.length > 0 && entry.action.length > 0)).toBe(true)
    expect(findOutboundTemplateById(all, 'locataire_rcs_relance_impaye')?.action).toBe(
      'Envoyer un RCS de relance'
    )
    expect(findOutboundTemplateById(all, 'caf_email_retablir_versement_apl')?.action).toBe(
      'Contacter la CAF'
    )
  })
})

function smsTemplate(id: string, group: string, label: string): OutboundRcsTemplate {
  return {
    channel: 'rcs',
    id,
    group,
    action: 'Envoyer un RCS de relance',
    label,
    body: 'RCS',
    sms_fallback: 'SMS',
    choices: []
  }
}

describe('groupOutboundTemplates', () => {
  const templates = [
    smsTemplate('b_sms', 'SMS au locataire', 'Zulu'),
    smsTemplate('a_sms', 'SMS au locataire', 'Alpha'),
    smsTemplate('caf_1', 'Courriel à la CAF', 'APL'),
    smsTemplate('loc_1', 'Courriel au locataire', 'Relance')
  ]

  test('sans ordre : rubriques et modèles en alpha fr', () => {
    expect(groupOutboundTemplates(templates).map((entry) => entry.group)).toEqual([
      'Courriel à la CAF',
      'Courriel au locataire',
      'SMS au locataire'
    ])
    expect(
      groupOutboundTemplates(templates)
        .find((entry) => entry.group === 'SMS au locataire')
        ?.templates.map((entry) => entry.label)
    ).toEqual(['Alpha', 'Zulu'])
  })

  test('avec ordre : cet ordre, hors liste à la fin (alpha), entrée sans fichier ignorée', () => {
    expect(
      groupOutboundTemplates(templates, [
        'SMS au locataire',
        'Courriel au locataire',
        'Courriel à la CAF'
      ]).map((entry) => entry.group)
    ).toEqual(['SMS au locataire', 'Courriel au locataire', 'Courriel à la CAF'])
    expect(
      groupOutboundTemplates(templates, ['SMS au locataire', 'Groupe inexistant']).map(
        (entry) => entry.group
      )
    ).toEqual(['SMS au locataire', 'Courriel à la CAF', 'Courriel au locataire'])
  })
})

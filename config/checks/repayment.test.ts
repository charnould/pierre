import { test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import repaymentConfig from '../../customization/repayments/config'
import { parseOutboundTemplate } from '../../desktop/src/features/repayment/lib/outbound-email-templates'
import { validateWorkflowConfig } from './workflow-config'

/** Motifs de clôture plan — alignés sur desktop/.../repayment-plan-close.ts */
const PLAN_CLOSE_MOTIFS = [
  'execution_complete',
  'non_respect',
  'remplacement_par_nouveau_plan',
  'effacement_de_dette'
] as const

const CLIENTS_PARTIS_BUCKET_ID = 'clients_partis'
const NON_TRAITES_BUCKET_ID = 'non_traites'
const TEMPLATES_DIR = join(import.meta.dir, '../../customization/repayments/templates')

function actionLabel(entry: unknown): string | null {
  if (typeof entry === 'string') {
    const label = entry.trim()
    return label || null
  }
  if (entry != null && typeof entry === 'object' && !Array.isArray(entry)) {
    const label = (entry as { label?: unknown }).label
    if (typeof label === 'string') {
      const trimmed = label.trim()
      return trimmed || null
    }
  }
  return null
}

/** Throw si `customization/repayments/config.ts` n’est pas conforme. */
function assertRepaymentConfig(config: unknown): void {
  const errors: string[] = []

  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('repayment: config doit être un objet')
  }

  const root = config as Record<string, unknown>
  errors.push(
    ...validateWorkflowConfig(root, {
      namespace: 'repayment',
      requiredBucketIds: [NON_TRAITES_BUCKET_ID, CLIENTS_PARTIS_BUCKET_ID]
    })
  )
  const bucketIds = new Set(
    Array.isArray(root.buckets)
      ? root.buckets.flatMap((entry) => {
          if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) return []
          const id = (entry as { id?: unknown }).id
          return typeof id === 'string' && id.trim() ? [id.trim()] : []
        })
      : []
  )

  const actionLabels = new Set<string>()
  if (root.actions == null || typeof root.actions !== 'object' || Array.isArray(root.actions)) {
    errors.push('repayment.actions: objet { dossier, bulk_operations } requis')
  } else {
    const groups = root.actions as Record<string, unknown>
    for (const group of ['dossier', 'bulk_operations']) {
      const entries = groups[group]
      if (!Array.isArray(entries)) {
        errors.push(`repayment.actions.${group}: tableau requis`)
        continue
      }
      for (const [i, entry] of entries.entries()) {
        const label = actionLabel(entry)
        if (!label) {
          errors.push(
            `repayment.actions.${group}[${i}]: label non vide requis (string ou { label })`
          )
          continue
        }
        if (actionLabels.has(label)) {
          errors.push(`repayment.actions: label en double « ${label} »`)
        }
        actionLabels.add(label)
      }
    }
  }

  if (root.template_actions != null) {
    errors.push(
      'repayment.template_actions: retiré — renseigner `action:` dans chaque template .md'
    )
  }

  const templateGroups = root.template_groups
  if (templateGroups != null) {
    if (!Array.isArray(templateGroups)) {
      errors.push('repayment.template_groups: tableau de chaînes requis')
    } else {
      const seenGroups = new Set<string>()
      for (const [i, entry] of templateGroups.entries()) {
        if (typeof entry !== 'string' || !entry.trim()) {
          errors.push(`repayment.template_groups[${i}]: chaîne non vide requise`)
          continue
        }
        const name = entry.trim()
        if (seenGroups.has(name)) {
          errors.push(`repayment.template_groups: rubrique en double « ${name} »`)
        }
        seenGroups.add(name)
      }
    }
  }

  let templateNames: string[] = []
  try {
    templateNames = readdirSync(TEMPLATES_DIR).filter((name) => name.endsWith('.md'))
  } catch {
    errors.push('repayment.templates: dossier customization/repayments/templates introuvable')
  }
  const seenTemplateIds = new Set<string>()
  for (const name of templateNames) {
    const parsed = parseOutboundTemplate(readFileSync(join(TEMPLATES_DIR, name), 'utf8'))
    if (!parsed) {
      errors.push(
        `repayment.templates: « ${name} » invalide (frontmatter incomplet ou channel inconnu)`
      )
      continue
    }
    if (seenTemplateIds.has(parsed.id)) {
      errors.push(`repayment.templates: id en double « ${parsed.id} » (${name})`)
    }
    seenTemplateIds.add(parsed.id)
    if (actionLabels.size > 0 && !actionLabels.has(parsed.action)) {
      errors.push(
        `repayment.templates: « ${name} » action « ${parsed.action} » absente de repayment.actions`
      )
    }
  }

  const createPlan = root.create_plan
  if (createPlan == null || typeof createPlan !== 'object' || Array.isArray(createPlan)) {
    errors.push('repayment.create_plan: objet requis { signed_bucket_id, close }')
  } else {
    const entry = createPlan as {
      signed_bucket_id?: unknown
      close?: unknown
    }
    const bucketId = typeof entry.signed_bucket_id === 'string' ? entry.signed_bucket_id.trim() : ''
    if (!bucketId || !bucketIds.has(bucketId)) {
      errors.push(
        `repayment.create_plan: signed_bucket_id « ${String(entry.signed_bucket_id)} » inconnu dans buckets`
      )
    }

    if (entry.close == null || typeof entry.close !== 'object' || Array.isArray(entry.close)) {
      errors.push('repayment.create_plan.close: objet requis (une entrée par motif)')
    } else {
      const closeRaw = entry.close as Record<string, unknown>
      for (const motif of PLAN_CLOSE_MOTIFS) {
        if (!(motif in closeRaw)) {
          errors.push(`repayment.create_plan.close: motif manquant « ${motif} »`)
          continue
        }
        const closeEntry = closeRaw[motif]
        if (closeEntry == null || typeof closeEntry !== 'object' || Array.isArray(closeEntry)) {
          errors.push(`repayment.create_plan.close.${motif}: objet { bucket_id } requis`)
          continue
        }
        const close = closeEntry as { bucket_id?: unknown }
        const closePhaseId = typeof close.bucket_id === 'string' ? close.bucket_id.trim() : ''
        if (!closePhaseId || !bucketIds.has(closePhaseId)) {
          errors.push(
            `repayment.create_plan.close.${motif}: bucket_id « ${String(close.bucket_id)} » inconnu dans buckets`
          )
        }
      }
      for (const key of Object.keys(closeRaw)) {
        if (!(PLAN_CLOSE_MOTIFS as readonly string[]).includes(key)) {
          errors.push(`repayment.create_plan.close: motif inconnu « ${key} »`)
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

test('repayment config.ts', () => {
  assertRepaymentConfig(repaymentConfig)
  console.log(`✅ repayment config.ts est OK!`)
})

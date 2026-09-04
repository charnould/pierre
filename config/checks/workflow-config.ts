export type WorkflowConfigRequirements = {
  namespace: string
  requiredBucketIds: readonly string[]
}

export function validateWorkflowConfig(
  root: Record<string, unknown>,
  requirements: WorkflowConfigRequirements
): string[] {
  const { namespace, requiredBucketIds } = requirements
  const errors: string[] = []
  const bucketIds = new Set<string>()

  if (!Array.isArray(root.buckets)) {
    errors.push(`${namespace}.buckets: tableau requis`)
  } else {
    for (const [index, entry] of root.buckets.entries()) {
      if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${namespace}.buckets[${index}]: objet { id, label } requis`)
        continue
      }
      const bucket = entry as { id?: unknown; label?: unknown }
      const id = typeof bucket.id === 'string' ? bucket.id.trim() : ''
      const label = typeof bucket.label === 'string' ? bucket.label.trim() : ''
      if (!id) {
        errors.push(`${namespace}.buckets[${index}]: id non vide requis`)
        continue
      }
      if (!label) errors.push(`${namespace}.buckets: label manquant pour id « ${id} »`)
      if (bucketIds.has(id)) errors.push(`${namespace}.buckets: id en double « ${id} »`)
      bucketIds.add(id)
    }
    for (const id of requiredBucketIds) {
      if (!bucketIds.has(id)) {
        errors.push(`${namespace}.buckets: le panier système « ${id} » est requis`)
      }
    }
  }

  if (!Array.isArray(root.tags)) {
    errors.push(`${namespace}.tags: tableau de chaînes requis`)
  } else {
    const seenTags = new Set<string>()
    for (const [index, entry] of root.tags.entries()) {
      if (typeof entry !== 'string' || !entry.trim()) {
        errors.push(`${namespace}.tags[${index}]: chaîne non vide requise`)
        continue
      }
      const label = entry.trim()
      if (seenTags.has(label)) errors.push(`${namespace}.tags: libellé en double « ${label} »`)
      seenTags.add(label)
    }
  }

  return errors
}

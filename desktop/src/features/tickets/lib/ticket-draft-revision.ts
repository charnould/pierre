export type DraftRevision = 'generated' | 'edited'

export type DraftVariantContent = {
  body: string
  subject: string
}

export type DraftVariants = {
  generated: DraftVariantContent
  edited: DraftVariantContent | null
  hasEdited: boolean
}

export function defaultDraftRevision(variants: DraftVariants): DraftRevision {
  return variants.hasEdited ? 'edited' : 'generated'
}

export function draftVariantForRevision(
  variants: DraftVariants,
  revision: DraftRevision
): DraftVariantContent {
  if (revision === 'edited' && variants.edited) return variants.edited
  return variants.generated
}

export function syncDraftVariantInCache(
  variants: DraftVariants,
  revision: DraftRevision,
  content: DraftVariantContent
): DraftVariants {
  if (revision === 'edited') {
    return { ...variants, edited: content, hasEdited: true }
  }
  return { ...variants, generated: content }
}

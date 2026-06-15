/**
 * Normalizes knowledge labels, filenames, table names, and column names to
 * lowercase ASCII `snake_case`.
 *
 * When `preserve_extension` is enabled, only the filename stem is normalized
 * and the last extension segment is kept unchanged. Use that mode for real
 * files (`rapport final.md` → `rapport_final.md`); keep the default for labels
 * and SQL identifiers (`Nom complet` → `nom_complet`).
 *
 * @param value - Raw value to normalize.
 * @param options - Normalization options.
 * @returns A normalized lowercase ASCII name.
 *
 * @example
 * normalize_knowledge_name('Résumé de l\'Œuvre.md') // 'resume_de_l_oeuvre_md'
 *
 * @example
 * normalize_knowledge_name('Résumé de l\'Œuvre.md', { preserve_extension: true }) // 'resume_de_l_oeuvre.md'
 */
export const normalize_knowledge_name = (
  value: string,
  options: { preserve_extension?: boolean } = {}
): string => {
  const last_dot_index = options.preserve_extension === true ? value.lastIndexOf('.') : -1
  const extension = last_dot_index > 0 ? value.slice(last_dot_index) : ''
  const stem = last_dot_index > 0 ? value.slice(0, last_dot_index) : value

  const normalized_stem = stem
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized_stem + extension
}

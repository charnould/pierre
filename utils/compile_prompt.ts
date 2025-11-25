/**
 * Asynchronously loads and compiles a Markdown prompt template by replacing triple-brace placeholders
 * with values from a provided variables map.
 *
 * The template file is resolved relative to the current module at:
 *   ../assets/{config}/prompts/{prompt}.md
 *
 * Placeholders use the syntax {{{ name }}} (triple braces). Whitespace inside the braces is allowed
 * and trimmed when matching keys. Each placeholder is replaced by the corresponding value from
 * `variables`. If a variable value is `null` or `undefined`, it is rendered as an empty string.
 *
 * @param config - The configuration folder name under `assets` containing the prompt templates.
 * @param prompt - The prompt file name (without the `.md` extension) to load and compile.
 * @param variables - An optional record mapping placeholder names to replacement values. Defaults to `{}`.
 *
 * @returns A Promise that resolves to the compiled template string.
 *
 * @throws {Error} If the template contains a placeholder for which no variable is provided
 *                 (e.g. a key used in `{{{ key }}}` is missing from `variables`).
 * @throws {Error} If reading the template file fails (e.g. file not found or I/O error). Such errors
 *                 are propagated from the underlying file read operation.
 *
 * @remarks
 * - Matching is done using a regular expression that finds `{{{ ... }}}` sequences and trims the key.
 * - This function intentionally fails fast on missing placeholders to help detect template/variable mismatches.
 */
export const compile_prompt = async (
  config: string,
  prompt: string,
  variables: Record<string, unknown> = {}
): Promise<string> => {
  // Build the full URL to the Markdown prompt file based on the config and prompt name
  const file_url = new URL(`../assets/${config}/prompts/${prompt}.md`, import.meta.url)

  // Read the template file as text
  const template = await Bun.file(file_url).text()

  // Replace all triple-brace placeholders ({{{ key }}}) with values from `variables`
  const compiled = template.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}/g, (_match, key) => {
    const name = key.trim() // Trim whitespace around the key

    // Throw an error if the key is missing in the provided variables
    if (!(name in variables)) {
      throw new Error(`Missing variable for placeholder: {{{${name}}}}`)
    }

    const val = variables[name]
    // Convert null or undefined values to empty string; otherwise, stringify the value
    return val == null ? '' : String(val)
  })

  // Return the final compiled template string
  return compiled
}

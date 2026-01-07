/**
 * Compiles a prompt template by replacing placeholders with provided variables.
 *
 * Supports two compilation modes:
 * - **Template mode**: Directly compile a template string
 * - **File mode**: Load a template from a markdown file and compile it
 *
 * @param options - Configuration object for prompt compilation
 * @param options.template - Optional template string to compile directly
 * @param options.config - Optional configuration name for file-based compilation
 * @param options.prompt - Optional prompt file name (without .md extension) for file-based compilation
 * @param options.variables - Optional record of variables to substitute into placeholders
 *
 * @returns Promise resolving to the compiled template string with all placeholders replaced
 *
 * @throws {Error} If neither `template` nor both `config` and `prompt` are provided
 * @throws {Error} If both `template` and `config`/`prompt` options are provided
 * @throws {Error} If a placeholder references a variable that is not provided
 *
 * @example
 * // Using template mode
 * const result = await compile_prompt({
 *   template: 'Hello {{{ name }}}!',
 *   variables: { name: 'World' }
 * })
 * // Returns: 'Hello World!'
 *
 * @example
 * // Using file mode
 * const result = await compile_prompt({
 *   config: 'my-config',
 *   prompt: 'greeting',
 *   variables: { name: 'Alice' }
 * })
 * // Loads and compiles: ../assets/my-config/prompts/greeting.md
 *
 * This function is tested.
 *
 */
export const compile_prompt = async (options: {
  template?: string
  config?: string
  prompt?: string
  variables?: Record<string, unknown>
}): Promise<string> => {
  const { template, config, prompt, variables = {} } = options

  // Validate that exactly one compilation mode is provided
  const hasTemplate = template != null
  const hasFileConfig = config != null && prompt != null

  if (!hasTemplate && !hasFileConfig) {
    throw new Error('Either `template` or both `config` and `prompt` must be provided')
  }

  if (hasTemplate && hasFileConfig) {
    throw new Error('Cannot provide both `template` and `config`/`prompt` options')
  }

  let templateString: string

  if (hasTemplate) {
    // String compilation
    templateString = template
  } else {
    // File compilation
    const file_url = new URL(`../assets/${config}/prompts/${prompt}.md`, import.meta.url)
    templateString = await Bun.file(file_url).text()
  }

  // Replace all triple-brace placeholders ({{{ key }}}) with values from `variables`
  const compiled = templateString.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}/g, (_match, key) => {
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

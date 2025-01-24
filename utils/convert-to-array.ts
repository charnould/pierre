/**
 * Converts LLM-generated text into an array of strings by splitting it using the
 * ‘|’ character as specified in the prompt. Each resulting string is trimmed to
 * remove any leading or trailing whitespace and newline characters, and empty
 * strings are filtered out from the final array.
 *
 * @note This function is tested in tests/utils/arrayify-text.test.ts
 * @param text - The input text to be converted into an array.
 * @returns An array of non-empty, trimmed strings.
 */
export const convert_to_array = (text: string): string[] =>
  text
    .split('|')
    .map((line) => line.replace(/\n/g, '').trim())
    .filter((line) => line.length > 0)

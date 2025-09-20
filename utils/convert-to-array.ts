/**
 * Converts a given text string into an array of strings by performing several transformations:
 * - Removes any content wrapped in `<think>` tags.
 * - Removes escaped double quotes (`\"`) and regular double quotes (`"`).
 * - Splits the string by the pipe character (`|`).
 * - Trims whitespace and removes newline characters from each resulting line.
 * - Filters out any empty strings from the result.
 *
 * @note This function is tested in tests/utils/convert-to-array.test.ts
 * @param text - The input string to be converted.
 * @returns An array of non-empty, cleaned strings.
 */
export const convert_to_array = (text: string): string[] =>
  text
    .replace(/<think>\s*(.*?)\s*<\/think>/, ' ')
    .replace(/\\"/g, '')
    .replace(/"/g, '')
    .split('|')
    .map((line) => line.replace(/\n/g, '').trim())
    .filter((line) => line.length > 0)

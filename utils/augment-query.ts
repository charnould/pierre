/**
 * Extracts the value of a specified tag from a given response string.
 *
 * @note This function is tested in tests/unit/utils/extract-tag-value.test.ts
 * @param response - The string containing the HTML/XML response.
 * @param tag - The tag whose value needs to be extracted.
 * @param fallback - The fallback value to return if the tag is not found.
 * @returns The extracted tag value in lowercase and trimmed, or the fallback value if the tag is not found.
 */
export const extract_tag_value = (
  response: string,
  tag: string,
  fallback: number | string | boolean | null
) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`)
  const match = response.match(regex)
  return match ? match[1].trim().toLowerCase() : fallback
}

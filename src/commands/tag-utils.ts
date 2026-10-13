export interface ParsedTagInput {
  tags: string[]
  options: string[]
}

/**
 * Parses user input containing tags and options into separate lists.
 * E.g. "json,json=omitempty,xml=attr" ->
 *   tags: ["json"]
 *   options: ["json=omitempty", "xml=attr"]
 *
 * Can also handle items with static values like "validate:gt=1,scope:read-only" ->
 *   tags: ["validate:gt=1", "scope:read-only"]
 */
export function parseTagAndOptionInput(input: string | string[]): ParsedTagInput {
  const items = Array.isArray(input)
    ? input.flatMap(item => item.split(',').map(s => s.trim()).filter(Boolean))
    : input.split(',').map(s => s.trim()).filter(Boolean)

  const tags: string[] = []
  const options: string[] = []

  for (const item of items) {
    const colonIndex = item.indexOf(':')
    const equalIndex = item.indexOf('=')

    // If '=' exists and is not part of a static tag value (which starts with key:value)
    if (equalIndex !== -1 && (colonIndex === -1 || equalIndex < colonIndex)) {
      options.push(item)
    } else {
      tags.push(item)
    }
  }

  return { tags, options }
}

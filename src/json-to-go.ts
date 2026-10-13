/**
 * A TypeScript port of the algorithm from https://github.com/mholt/json-to-go,
 * which translates JSON into a Go type definition. The port keeps the default
 * behaviour of the original: flattened output, no example values, and
 * `omitempty` only on fields that are missing from some element of an array.
 */

export interface JsonToGoResult {
  go: string
  error?: string
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

// Initialisms that Go lint expects to be upper-cased in identifiers.
const commonInitialisms = [
  'ACL',
  'API',
  'ASCII',
  'CPU',
  'CSS',
  'DNS',
  'EOF',
  'GUID',
  'HTML',
  'HTTP',
  'HTTPS',
  'ID',
  'IP',
  'JSON',
  'LHS',
  'QPS',
  'RAM',
  'RHS',
  'RPC',
  'SLA',
  'SMTP',
  'SQL',
  'SSH',
  'TCP',
  'TLS',
  'TTL',
  'UDP',
  'UI',
  'UID',
  'UUID',
  'URI',
  'URL',
  'UTF8',
  'VM',
  'XML',
  'XMPP',
  'XSRF',
  'XSS',
]

const digitWords: Record<string, string> = {
  0: 'Zero_',
  1: 'One_',
  2: 'Two_',
  3: 'Three_',
  4: 'Four_',
  5: 'Five_',
  6: 'Six_',
  7: 'Seven_',
  8: 'Eight_',
  9: 'Nine_',
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const uuidLength = 36

// The prototype tag distinguishes arrays, objects and primitives.
function stringTag(value: Json): string {
  return Object.prototype.toString.call(value)
}

function areSameType(a: Json, b: Json): boolean {
  return stringTag(a) === stringTag(b)
}

function areObjects(a: Json, b: Json): boolean {
  return stringTag(a) === '[object Object]' && stringTag(b) === '[object Object]'
}

function compareObjectKeys(a: string[], b: string[]): boolean {
  if (a.length === 0 && b.length === 0) return true
  if (a.length !== b.length) return false
  return a.every(item => b.includes(item))
}

// Prefixes a leading number so the result is a valid Go identifier.
function formatNumber(value: string): string {
  if (!value) return ''
  if (/^\d+$/.test(value)) return `Num${value}`
  const first = value[0]
  if (first >= '0' && first <= '9') return digitWords[first] + value.slice(1)
  return value
}

// Proper cases a string according to Go conventions.
function toProperCase(value: string): string {
  let str = value
  // ensure that the SCREAMING_SNAKE_CASE is converted to snake_case
  if (/^[_A-Z0-9]+$/.test(str)) str = str.toLowerCase()

  return str.replace(/(^|[^a-zA-Z])([a-z]+)/g, (_match, sep: string, frag: string) => {
    if (commonInitialisms.includes(frag.toUpperCase())) return sep + frag.toUpperCase()
    return sep + frag[0].toUpperCase() + frag.slice(1).toLowerCase()
  }).replace(/([A-Z])([a-z]+)/g, (_match, sep: string, frag: string) => {
    if (commonInitialisms.includes(sep + frag.toUpperCase())) return (sep + frag).toUpperCase()
    return sep + frag
  })
}

// Sanitizes and formats a string into an appropriate identifier in Go.
function format(value: string): string {
  const sanitized = toProperCase(formatNumber(value)).replace(/[^a-z0-9]/gi, '')
  if (!sanitized) return 'NAMING_FAILED'
  // After sanitizing, the remaining characters can start with a number.
  return formatNumber(sanitized)
}

// Determines the most appropriate Go type for a JSON value.
function goType(value: Json): string {
  if (value === null) return 'any'

  switch (typeof value) {
    case 'string':
      return /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:\+\d\d:\d\d|Z)$/.test(value) ? 'time.Time' : 'string'
    case 'number':
      if (value % 1 === 0) {
        return value > -2147483648 && value < 2147483647 ? 'int' : 'int64'
      }
      return 'float64'
    case 'boolean':
      return 'bool'
    case 'object':
      return Array.isArray(value) ? 'slice' : 'struct'
    default:
      return 'any'
  }
}

// Given two types, returns the more specific of the two.
function mostSpecificPossibleGoType(type1: string, type2: string): string {
  if (type1.startsWith('float') && type2.startsWith('int')) return type1
  if (type1.startsWith('int') && type2.startsWith('float')) return type2
  return 'any'
}

// Widens two number types to their larger equivalent, or null to fall back to
// the `any` type.
function findBestValueForNumberType(existingValue: number, newValue: number): number | null {
  const newGoType = goType(newValue)
  const existingGoType = goType(existingValue)

  if (newGoType === existingGoType) return existingValue
  // always upgrade float64
  if (newGoType === 'float64') return newValue
  if (existingGoType === 'float64') return existingValue

  // it's too complex to distinguish int types and float32, so we force-upgrade to float64
  if (newGoType.includes('float') && existingGoType.includes('int')) return Number.MAX_VALUE
  if (newGoType.includes('int') && existingGoType.includes('float')) return Number.MAX_VALUE

  if (newGoType.includes('int') && existingGoType.includes('int')) {
    const sum = Math.abs(existingValue) + Math.abs(newValue)
    // an overflow means the numbers are very large, so we force int64
    if (!Number.isFinite(sum)) return Number.MAX_SAFE_INTEGER
    return sum
  }

  return null
}

// Generates a unique name to avoid duplicate struct and field names.
function uniqueTypeName(name: string, seen: string[], prefix?: string | null): string {
  if (!seen.includes(name)) return name

  if (prefix) {
    const prefixed = prefix + name
    if (!seen.includes(prefixed)) return prefixed
    name = prefixed
  }

  let index = 0
  for (;;) {
    const candidate = name + index
    if (!seen.includes(candidate)) return candidate
    index++
  }
}

// Recovers the original key from a name suffixed with a UUID during collision
// handling.
function getOriginalName(unique: string): string {
  if (unique.length >= uuidLength && uuidPattern.test(unique.slice(-uuidLength))) {
    return unique.slice(0, -1 * (uuidLength + 1))
  }
  return unique
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : (random & 0x3 | 0x8)
    return value.toString(16)
  })
}

export function jsonToGo(json: string, typename?: string): JsonToGoResult {
  let data: Json
  try {
    // A trailing ".0" is dropped by JSON.parse; nudge it to ".1" so integral
    // floats keep their float type.
    data = JSON.parse(json.replace(/(:\s*(?:\[\s*)?-?\d*)\.0/g, '$1.1')) as Json
  } catch (error) {
    return { go: '', error: error instanceof Error ? error.message : String(error) }
  }

  const seen: Record<string, string[]> = {}
  const stack: string[] = []
  const globallySeenTypeNames: string[] = []
  let go = ''
  let tabs = 0
  let accumulator = ''
  let parent = ''
  let previousParents = ''

  go += `type ${format(typename || 'AutoGenerated')} `

  parseScope(data)

  go += accumulator
  // add final newline for POSIX 3.206
  if (!go.endsWith('\n')) go += '\n'

  return { go }

  function parseScope(scope: Json, depth = 0): void {
    if (typeof scope === 'object' && scope !== null) {
      if (Array.isArray(scope)) {
        let sliceType: string | undefined
        const scopeLength = scope.length

        for (let i = 0; i < scopeLength; i++) {
          const thisType = goType(scope[i])
          if (!sliceType) {
            sliceType = thisType
          } else if (sliceType !== thisType) {
            sliceType = mostSpecificPossibleGoType(thisType, sliceType)
            if (sliceType === 'any') break
          }
        }

        const slice = sliceType === 'struct' || sliceType === 'slice' ? `[]${parent}` : '[]'
        if (depth >= 2) appender(slice)
        else append(slice)

        if (sliceType === 'struct') {
          const allFields: Record<string, { value: Json, count: number }> = {}

          // For each field, count how many times it appears.
          for (let i = 0; i < scopeLength; i++) {
            const element = scope[i] as Record<string, Json>
            const keys = Object.keys(element)
            for (let k = 0; k < keys.length; k++) {
              let keyname = keys[k]
              if (!(keyname in allFields)) {
                allFields[keyname] = { value: element[keyname], count: 0 }
              } else {
                const existingValue = allFields[keyname].value
                const currentValue = element[keyname]

                if (!areSameType(existingValue, currentValue)) {
                  // force type "any" if types are not identical
                  if (existingValue !== null) allFields[keyname].value = null
                  allFields[keyname].count++
                  continue
                }

                // if a value was first detected as int (7) and a second time as float64 (3.14)
                // then we want to select float64, not int. Similar for int64 and float64.
                if (areSameType(currentValue, 1)) {
                  allFields[keyname].value = findBestValueForNumberType(existingValue as number, currentValue as number)
                }

                if (areObjects(existingValue, currentValue)) {
                  const sameKeys = compareObjectKeys(
                    Object.keys(currentValue as Record<string, Json>),
                    Object.keys(existingValue as Record<string, Json>),
                  )
                  if (!sameKeys) {
                    // this can only handle two duplicate items
                    keyname = `${keyname}_${uuidv4()}`
                    allFields[keyname] = { value: currentValue, count: 0 }
                  }
                }
              }
              allFields[keyname].count++
            }
          }

          // create a common struct with all fields found in the current array;
          // omitempty indicates if a field is optional
          const keys = Object.keys(allFields)
          const struct: Record<string, Json> = {}
          const omitempty: Record<string, boolean> = {}
          for (const keyname of keys) {
            const field = allFields[keyname]
            struct[keyname] = field.value
            omitempty[keyname] = field.count !== scopeLength
          }
          parseStruct(depth + 1, struct, omitempty, previousParents)
        } else if (sliceType === 'slice') {
          parseScope(scope[0], depth)
        } else {
          if (depth >= 2) appender(sliceType || 'any')
          else append(sliceType || 'any')
        }
      } else {
        if (depth >= 2) appender(parent)
        else append(parent)
        parseStruct(depth + 1, scope, false, previousParents)
      }
    } else {
      if (depth >= 2) appender(goType(scope))
      else append(goType(scope))
    }
  }

  function parseStruct(
    depth: number,
    scope: Record<string, Json>,
    omitempty: Record<string, boolean> | false,
    oldParents: string,
  ): void {
    stack.push(depth >= 2 ? '\n' : '')

    const seenTypeNames: string[] = []

    if (depth >= 2) {
      const scopeKeys = formatScopeKeys(Object.keys(scope))

      // this can only handle two duplicate items
      if (parent in seen && compareObjectKeys(scopeKeys, seen[parent])) {
        stack.pop()
        return
      }
      seen[parent] = scopeKeys

      appender(`type ${parent} struct {\n`)
      const keys = Object.keys(scope)
      previousParents = parent
      // Flattened struct bodies indent their fields by a single tab; the
      // original passes a fresh indent counter to every nested call.
      for (const key of keys) {
        const keyname = getOriginalName(key)
        indenter(1)
        let typename: string
        // structs will be defined on the top level of the go file, so they need to be globally unique
        if (typeof scope[key] === 'object' && scope[key] !== null) {
          typename = uniqueTypeName(format(keyname), globallySeenTypeNames, previousParents)
          globallySeenTypeNames.push(typename)
        } else {
          typename = uniqueTypeName(format(keyname), seenTypeNames)
          seenTypeNames.push(typename)
        }

        appender(`${typename} `)
        parent = typename
        parseScope(scope[key], depth)
        appender(` \`json:"${keyname}`)
        if (omitempty && omitempty[key] === true) appender(',omitempty')
        appender('"`\n')
      }
      appender('}')
      previousParents = oldParents
    } else {
      append('struct {\n')
      ++tabs
      const keys = Object.keys(scope)
      previousParents = parent
      for (const key of keys) {
        const keyname = getOriginalName(key)
        indent(tabs)
        let typename: string
        // structs will be defined on the top level of the go file, so they need to be globally unique
        if (typeof scope[key] === 'object' && scope[key] !== null) {
          typename = uniqueTypeName(format(keyname), globallySeenTypeNames, previousParents)
          globallySeenTypeNames.push(typename)
        } else {
          typename = uniqueTypeName(format(keyname), seenTypeNames)
          seenTypeNames.push(typename)
        }

        append(`${typename} `)
        parent = typename
        parseScope(scope[key], depth)
        append(` \`json:"${keyname}`)
        if (omitempty && omitempty[key] === true) append(',omitempty')
        append('"`\n')
      }
      indent(--tabs)
      append('}')
      previousParents = oldParents
    }

    accumulator += stack.pop() ?? ''
  }

  function indent(level: number): void {
    for (let i = 0; i < level; i++) go += '\t'
  }

  function append(text: string): void {
    go += text
  }

  function appender(text: string): void {
    stack[stack.length - 1] += text
  }

  function indenter(level: number): void {
    for (let i = 0; i < level; i++) stack[stack.length - 1] += '\t'
  }

  function formatScopeKeys(keys: string[]): string[] {
    for (let i = 0; i < keys.length; i++) keys[i] = format(keys[i])
    return keys
  }
}

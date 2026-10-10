// Generates the reference pages for the coc-golang docs site from the
// extension's own metadata (package.json + src/tools.ts), so the command,
// settings and tools references can never drift from the code.
//
// Run from anywhere: `node docs/scripts/generate.ts`
// Verify only (no writes): `node docs/scripts/generate.ts --check`

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
const contentDir = join(repoRoot, 'docs', 'content', 'docs')
const outDir = join(contentDir, 'reference')
const checkOnly = process.argv.includes('--check')

interface Command { command: string, title: string, category?: string }
interface Schema {
  type?: string | string[]
  items?: { type?: string | string[] }
  default?: unknown
  enum?: unknown[]
  enumDescriptions?: string[]
  markdownEnumDescriptions?: string[]
  description?: string
  markdownDescription?: string
  deprecationMessage?: string
  properties?: Record<string, Schema>
  additionalProperties?: unknown
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

// MDX treats `{` and `<` as syntax outside code, so neutralise them in prose
// while leaving fenced code blocks, indented code, and inline code untouched.
// HTML entities are used (rather than backslash escapes) so a `{` at the start
// of a line cannot combine with a preceding backslash into an escaped newline.
function escapeInline(line: string): string {
  let out = ''
  let index = 0
  let inCode = false
  while (index < line.length) {
    const char = line[index]
    if (char === '`') {
      let end = index
      while (end < line.length && line[end] === '`') end++
      inCode = !inCode
      out += line.slice(index, end)
      index = end
      continue
    }
    if (!inCode && (char === '{' || char === '}' || char === '<')) {
      out += char === '<' ? '&lt;' : `&#${char.charCodeAt(0)};`
    }
    else {
      out += char
    }
    index++
  }
  return out
}

function escapeProse(text: string): string {
  const lines = text.split('\n')
  let inFence = false
  return lines.map((line) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    // Fenced and 4-space-indented code blocks are rendered verbatim; escaping
    // their braces or angle brackets would corrupt the displayed code.
    if (inFence || /^(?:\t| {4})/.test(line)) return line
    return escapeInline(line)
  }).join('\n')
}

function escapeCell(text: string): string {
  return escapeInline(text.replace(/\n/g, ' ')).replace(/\|/g, '\\|')
}

function firstLine(text: string, max = 120): string {
  const line = text.split('\n').map(part => part.trim()).find(Boolean) ?? ''
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`
  const separator = `| ${headers.map(() => '---').join(' | ')} |`
  return [head, separator, ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n')
}

function renderType(schema: Schema): string {
  const { type } = schema
  if (Array.isArray(type)) return type.join(' | ')
  if (type === 'array') {
    const item = schema.items?.type
    if (!item) return 'array'
    return `${Array.isArray(item) ? item.join(' | ') : item}[]`
  }
  return type ?? 'object'
}

function renderDefault(schema: Schema): string | undefined {
  if (!('default' in schema) || schema.default === undefined) return undefined
  return `\`${JSON.stringify(schema.default)}\``
}

function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${text}`
}

// A single setting rendered as a heading + type/default line + description.
function renderSetting(path: string, schema: Schema, level = 2): string {
  const lines: string[] = [heading(level, `\`${path}\``), '']

  const meta = [`**Type:** \`${renderType(schema)}\``]
  const fallback = renderDefault(schema)
  if (fallback) meta.push(`**Default:** ${fallback}`)
  lines.push(meta.join(' · '))
  lines.push('')

  if (schema.deprecationMessage) {
    lines.push(`> **Deprecated:** ${escapeProse(schema.deprecationMessage).replace(/\n/g, ' ')}`)
    lines.push('')
  }

  const description = schema.markdownDescription ?? schema.description
  if (description) {
    lines.push(escapeProse(description.trim()))
    lines.push('')
  }

  if (Array.isArray(schema.enum)) {
    const descriptions = schema.markdownEnumDescriptions ?? schema.enumDescriptions ?? []
    lines.push('**Options:**')
    lines.push('')
    for (const [index, value] of schema.enum.entries()) {
      const raw = descriptions[index]
      const detail = typeof raw === 'string' ? raw.trim().replace(/\n/g, ' ') : ''
      lines.push(`- \`${String(value)}\`${detail ? ` — ${escapeProse(detail)}` : ''}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// Walks a schema tree, emitting one section per leaf (dotted path).
function collectSettings(properties: Record<string, Schema>, prefix: string): Array<{ path: string, schema: Schema }> {
  const result: Array<{ path: string, schema: Schema }> = []
  for (const [key, schema] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${key}` : key
    result.push({ path, schema })
    if (schema.properties) result.push(...collectSettings(schema.properties, path))
  }
  return result
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function readPackage() {
  return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
}

const commandGroups: Array<{ title: string, match: (id: string) => boolean }> = [
  { title: 'Tests & benchmarks', match: id => /^go\.(test|subtest|toggle\.test|benchmark)\./.test(id) },
  { title: 'Build, vet, lint, run', match: id => /^go\.(build|vet|lint|generate)\./.test(id) || id === 'go.run' || id === 'go.vulncheck.toggle' },
  { title: 'Formatting & imports', match: id => /^go\.(fmt|import)\./.test(id) },
  { title: 'Modules', match: id => /^go\.mod\./.test(id) },
  { title: 'Workspaces', match: id => /^go\.work\./.test(id) },
  { title: 'Dependencies & packages', match: id => /^go\.(get|install|browse)\./.test(id) },
  { title: 'Struct tags & code generation', match: id => /^go\.(tags|impl)\./.test(id) },
  { title: 'Environment & tools', match: () => true },
]

function renderCommands(commands: Command[]): string {
  const grouped = new Map<string, Command[]>()
  for (const group of commandGroups) grouped.set(group.title, [])

  for (const command of commands) {
    // First match wins; the final catch-all group guarantees every command lands somewhere.
    const group = commandGroups.find(candidate => candidate.match(command.command))
    if (!group) throw new Error(`Command "${command.command}" matched no group`)
    grouped.get(group.title)!.push(command)
  }

  const total = [...grouped.values()].reduce((sum, list) => sum + list.length, 0)
  if (total !== commands.length) {
    throw new Error(`Command grouping lost entries: ${total} of ${commands.length}`)
  }

  const parts = ['## Commands', '', `All ${commands.length} commands are run with \`:CocCommand <id>\`.`, '']
  for (const group of commandGroups) {
    const items = grouped.get(group.title)!
    if (!items.length) continue
    parts.push(heading(3, group.title), '')
    parts.push(table(['Command', 'What it does'], items.map(command => [
      `\`${command.command}\``,
      escapeCell(command.title),
    ])))
    parts.push('')
  }
  return parts.join('\n')
}

function renderSettings(properties: Record<string, Schema>): string {
  const settings = collectSettings(properties, '')
  const rows = settings.map(({ path, schema }) => [
    `\`${path}\``,
    `\`${renderType(schema)}\``,
    renderDefault(schema) ?? '—',
  ])
  const parts = [
    `This page lists the ${settings.length} \`go.*\` settings. See [gopls settings](./gopls-settings) for language-server options.`,
    '',
    table(['Setting', 'Type', 'Default'], rows),
    '',
    '## Settings',
    '',
    settings.map(({ path, schema }) => renderSetting(path, schema)).join('\n'),
  ]
  return parts.join('\n')
}

function analyserPage(analyses: Schema): string {
  const entries = Object.entries(analyses.properties ?? {})
  const rows = entries.map(([id, schema]) => [
    `\`${id}\``,
    renderDefault(schema) ?? '—',
    escapeCell(firstLine(schema.markdownDescription ?? schema.description ?? '')),
  ])
  const parts = [
    `gopls bundles the analyzer suite below. Enable or disable one by setting it under \`gopls.analyses\`, for example \`{"gopls": {"analyses": {"unusedwrite": false}}}\`. There are ${entries.length} analyzers.`,
    '',
    table(['Analyzer', 'Default', 'Summary'], rows),
    '',
    '## Analyzers',
    '',
    entries.map(([id, schema]) => renderSetting(id, schema, 3)).join('\n'),
  ]
  return parts.join('\n')
}

function renderGoplsSettings(gopls: Schema): string {
  const properties = gopls.properties ?? {}
  const direct = Object.entries(properties).filter(([key]) => key !== 'analyses')
  const parts = [
    'These options configure `gopls` and are passed through as-is. See the',
    '[Analyzer reference](./gopls-analyses) for the bundled analyzers.',
    '',
    table(['Setting', 'Type', 'Default'], direct.map(([key, schema]) => [
      `\`gopls.${key}\``,
      `\`${renderType(schema)}\``,
      renderDefault(schema) ?? '—',
    ])),
    '',
    '## gopls settings',
    '',
    direct.flatMap(([key, schema]) => {
      if (key === 'codelenses' || key === 'hints' || key === 'annotations') {
        const children = schema.properties ?? {}
        return [
          renderSetting(`gopls.${key}`, schema),
          ...Object.entries(children).map(([child, childSchema]) => renderSetting(`gopls.${key}.${child}`, childSchema, 3)),
        ]
      }
      return [renderSetting(`gopls.${key}`, schema)]
    }).join('\n'),
  ]
  return parts.join('\n')
}

interface Tool { name: string, module: string, optional: boolean }

function parseTools(): Tool[] {
  const source = readFileSync(join(repoRoot, 'src', 'tools.ts'), 'utf8')
  const marker = source.indexOf('export const tools')
  if (marker === -1) throw new Error('Could not find `tools` in src/tools.ts')

  const start = source.indexOf('{', marker)
  let depth = 0
  let end = start
  for (; end < source.length; end++) {
    if (source[end] === '{') depth++
    else if (source[end] === '}' && --depth === 0) break
  }
  const block = source.slice(start + 1, end)

  const tools: Tool[] = []
  const entryPattern = /(['"])([^'"]+)\1\s*:\s*\{([^{}]*)\}/g
  for (let match = entryPattern.exec(block); match; match = entryPattern.exec(block)) {
    const [, , name, body] = match
    const module = /module:\s*(['"])([^'"]+)\1/.exec(body)?.[2]
    if (!module) throw new Error(`Could not parse the module for tool "${name}"`)
    tools.push({ name, module, optional: /optional:\s*true/.test(body) })
  }
  return tools
}

function renderTools(tools: Tool[], commands: Command[]): string {
  const declared = new Set(commands.map(command => command.command).filter(id => id.startsWith('go.tools.install.')))
  for (const tool of tools) {
    if (!declared.delete(`go.tools.install.${tool.name}`)) {
      throw new Error(`Tool "${tool.name}" has no matching go.tools.install command`)
    }
  }
  if (declared.size) {
    throw new Error(`Commands without a matching tool: ${[...declared].join(', ')}`)
  }

  return [
    `coc-golang installs ${tools.length} Go tools with \`go install\`. Install one with its command, or run \`:CocCommand go.tools.install\` to pick from a list.`,
    '',
    table(['Tool', 'Module', 'Install command', 'Optional'], tools.map(tool => [
      `\`${tool.name}\``,
      `\`${tool.module.split('@')[0]}\``,
      `\`go.tools.install.${tool.name}\``,
      tool.optional ? 'yes' : 'no',
    ])),
    '',
    'Optional tools are only needed for their specific feature; run `:CocCommand go.locate.tools` to see what is already installed.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Changelog
// ---------------------------------------------------------------------------

// release-please writes a H1 per release ("## [0.5.0](compare-url) (date)") and
// H2 sections per change type, so shifting the headings by two levels nests
// each release under the page's own H1 while the version stays a real anchor.
function indentHeadings(markdown: string): string {
  return markdown.replace(/^(#{1,6})(\s)/gm, '##$1$2')
}

// release-please links the version in a release heading to its compare URL.
// fumadocs wraps every heading's content in an anchor of its own, so a link
// there would nest one <a> inside another — invalid HTML that the browser
// reparents, breaking hydration. Keep the version as plain text instead; the
// GitHub copy of CHANGELOG.md still carries the compare links.
function unlinkHeadings(markdown: string): string {
  return markdown.replace(/^#{1,6} .*$/gm, line => line.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))
}

// The changelog page is a copy of the repository's CHANGELOG.md (written by
// release-please at the repo root, outside this Next.js app and so outside its
// reach). The copy is generated on the fly and git-ignored, never committed.
function renderChangelogPage(): string {
  const changelog = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')
  const releases = changelog.replace(/^# Changelog\s*/, '').trim()
  if (!releases) throw new Error('CHANGELOG.md has no releases')
  return frontmatter('Changelog', 'Release notes for coc-golang.', 'CHANGELOG.md')
    + indentHeadings(unlinkHeadings(releases)) + '\n'
}

// A Next.js build runs without the repo root, so an existing copy that differs
// only in line endings is left alone rather than reported as drift.
function sameContent(a: string | undefined, b: string): boolean {
  return a !== undefined && a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n')
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function frontmatter(title: string, description: string, source = 'package.json (and src/tools.ts)'): string {
  return [
    '---',
    `title: ${title}`,
    `description: ${description}`,
    '---',
    '',
    `<!-- Generated from ${source}. Do not edit by hand. -->`,
    '',
  ].join('\n')
}

function build(): Map<string, string> {
  const pkg = readPackage()
  const commands: Command[] = pkg.contributes.commands
  const properties: Record<string, Schema> = pkg.contributes.configuration.properties
  const { gopls, ...goSettings } = properties
  const tools = parseTools()

  const files = new Map<string, string>()
  files.set('commands.md', frontmatter('Commands', 'Every go.* command, grouped by area.')
    + renderCommands(commands) + '\n')
  files.set('settings.md', frontmatter('Settings', 'Configuration reference for the go.* settings.')
    + renderSettings(goSettings) + '\n')
  files.set('gopls-settings.md', frontmatter('gopls settings', 'Options passed to the gopls language server.')
    + renderGoplsSettings(gopls) + '\n')
  files.set('gopls-analyses.md', frontmatter('Analyzer reference', 'The analyzers bundled with gopls.')
    + analyserPage((gopls.properties as Record<string, Schema>).analyses) + '\n')
  files.set('tools.md', frontmatter('Go tools', 'The Go tools coc-golang can install for you.')
    + renderTools(tools, commands) + '\n')
  files.set('meta.json', `${JSON.stringify({
    title: 'Reference',
    pages: ['commands', 'settings', 'gopls-settings', 'gopls-analyses', 'tools'],
  }, null, 2)}\n`)
  files.set(join('..', 'meta.json'), `${JSON.stringify({
    title: 'coc-golang',
    pages: ['index', 'getting-started', 'keybindings', 'troubleshooting', 'reference', 'changelog'],
  }, null, 2)}\n`)
  files.set(join('..', 'changelog.md'), renderChangelogPage())
  return files
}

function main(): void {
  const files = build()
  // The changelog copy is derived from CHANGELOG.md at build time and never
  // committed, so `--check` neither requires it to exist nor reports it: only
  // the generated pages tracked in git are checked for drift.
  if (checkOnly) files.delete(join('..', 'changelog.md'))
  let drift = false

  for (const [name, content] of files) {
    const target = join(outDir, name)
    const exists = existsSync(target)
    const existing = exists ? readFileSync(target, 'utf8') : undefined
    if (checkOnly) {
      if (!sameContent(existing, content)) {
        drift = true
        console.error(`drift: ${relative(repoRoot, target)}`)
      }
      continue
    }
    // Writes stay literal: a file that differs only in line endings (a copy
    // checked out by git) is still rewritten to the canonical LF content.
    if (existing !== content) {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content)
      console.log(`wrote ${relative(repoRoot, target)}`)
    }
  }

  if (checkOnly && drift) {
    console.error('Reference pages are out of date. Run `node docs/scripts/generate.ts`.')
    process.exit(1)
  }
  if (checkOnly) console.log('Reference pages are up to date.')
}

main()

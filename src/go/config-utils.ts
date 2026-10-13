export type GoplsOptions = Record<string, unknown>

export interface GoplsSettings {
  buildFlags: string[]
  buildTags: string
  inlayHints: Record<string, boolean>
  vulncheck?: string
  runTestCodeLens: boolean
}

export interface TestSettings {
  testFlags: string[] | null
  buildFlags: string[]
  testTags: string | null
  buildTags: string
  testTimeout: string
}

const defaultCodeLenses = {
  generate: true,
  run_govulncheck: true,
  test: true,
  tidy: true,
  upgrade_dependency: true,
  vendor: true,
}

function hasFlag(flags: string[], ...names: string[]): boolean {
  return flags.some(flag => names.some(name => flag === name || flag.startsWith(`${name}=`)))
}

export function buildFlagsWithTags(buildFlags: string[], tags: string): string[] {
  const flags = [...buildFlags]
  if (tags && !hasFlag(flags, '-tags')) flags.push('-tags', tags)
  return flags
}

export function testFlagsFor(settings: TestSettings): string[] {
  const flags = [...(settings.testFlags ?? settings.buildFlags)]
  const tags = settings.testTags ?? settings.buildTags
  const result = buildFlagsWithTags(flags, tags)
  if (settings.testTimeout && !hasFlag(result, '-timeout', '-test.timeout')) {
    result.push('-timeout', settings.testTimeout)
  }
  return result
}

export function parseEnvFile(text: string): Record<string, string> {
  const environment: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][\w.]*)\s*=(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if (value.length >= 2 && (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    )) {
      value = value.slice(1, -1)
    }
    environment[match[1]] = value
  }
  return environment
}

// Mirrors vscode-go: the GOPATH is the part of the path before the last `src` directory.
export function inferGopath(folder: string): string | undefined {
  const directories = folder.replace(/\\/g, '/').split('/')
  const index = directories.map(directory => directory.toLowerCase()).lastIndexOf('src')
  if (index <= 0) return undefined
  const gopath = directories.slice(0, index).join('/')
  return folder.slice(0, gopath.length)
}

export function pathKey(environment: NodeJS.ProcessEnv): string {
  return Object.keys(environment).find(key => key.toLowerCase() === 'path') ?? 'PATH'
}

export function prependPath(environment: NodeJS.ProcessEnv, directory: string, separator: string): void {
  const key = pathKey(environment)
  const current = environment[key]
  environment[key] = current ? `${directory}${separator}${current}` : directory
}

// Passes the relevant `go.*` settings to gopls unless gopls settings already specify them.
export function goplsConfiguration(user: GoplsOptions, settings: GoplsSettings): GoplsOptions {
  const options: GoplsOptions = { ...user }
  const specified = (...keys: string[]) => keys.some(key => options[key] !== undefined)

  if (!specified('build.buildFlags', 'buildFlags')) {
    const flags = buildFlagsWithTags(settings.buildFlags, settings.buildTags)
    if (flags.length) options['build.buildFlags'] = flags
  }
  if (!specified('ui.inlayhint.hints', 'hints') && Object.keys(settings.inlayHints).length) {
    options['ui.inlayhint.hints'] = { ...settings.inlayHints }
  }
  if (!specified('ui.vulncheck', 'vulncheck') && settings.vulncheck) {
    options['ui.vulncheck'] = settings.vulncheck
  }

  const lensKey = options['ui.codelenses'] !== undefined ? 'ui.codelenses' : 'codelenses'
  options[lensKey] = {
    ...defaultCodeLenses,
    test: settings.runTestCodeLens,
    ...(options[lensKey] as Record<string, boolean> | undefined),
  }
  return options
}

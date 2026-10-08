interface Configuration {
  get: <T>(name: string) => T | undefined
}

export interface PublishedDiagnostic {
  range: unknown
  message: string
  severity: number
}

const settings = new Map<string, unknown>()

export const messages: string[] = []
export const diagnostics = new Map<string, [string, PublishedDiagnostic[]][]>()

export const workspace = {
  cwd: process.cwd(),
  workspaceFolders: [] as { uri: string }[],
  getConfiguration: (_section: string): Configuration => ({
    get: <T>(name: string) => settings.get(name) as T | undefined,
  }),
}

export const window = {
  showWarningMessage: (message: string): void => { messages.push(message) },
  showErrorMessage: (message: string): void => { messages.push(message) },
  showInformationMessage: (message: string): void => { messages.push(message) },
  showMessage: (message: string): void => { messages.push(message) },
  showPrompt: async (): Promise<boolean> => false,
  createOutputChannel: (name: string) => ({
    name,
    append: () => undefined,
    appendLine: () => undefined,
    show: () => undefined,
    dispose: () => undefined,
  }),
}

export const languages = {
  createDiagnosticCollection: (name: string) => ({
    clear: (): void => { diagnostics.set(name, []) },
    set: (entries: [string, PublishedDiagnostic[]][]): void => { diagnostics.set(name, entries) },
    dispose: () => undefined,
  }),
}

export const DiagnosticSeverity = { Error: 1, Warning: 2, Information: 3, Hint: 4 }

export const Range = {
  create: (startLine: number, startCharacter: number, endLine: number, endCharacter: number) => ({
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  }),
}

export const Diagnostic = {
  create: (range: unknown, message: string, severity: number): PublishedDiagnostic => ({
    range,
    message,
    severity,
  }),
}

export function configure(values: Record<string, unknown>): void {
  settings.clear()
  for (const [name, value] of Object.entries(values)) settings.set(name, value)
}

export function resetCoc(): void {
  settings.clear()
  messages.length = 0
  diagnostics.clear()
  workspace.cwd = process.cwd()
  workspace.workspaceFolders = []
}

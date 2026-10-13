import type { Ctx } from '../ctx'
import { readFileSync } from 'node:fs'
import { window } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { parseEnvFile } from '../go/config-utils'

export interface PreviousTest {
  args: string[]
  cwd: string
}

export interface TestRunResult {
  code: number | null
  output: string
}

export interface TestPackage {
  importPath: string
  dir: string
  testFiles: string[]
}

const listFormat = '{{.ImportPath}}\t{{.Dir}}\t{{join .TestGoFiles ","}}\t{{join .XTestGoFiles ","}}'

export class TestRunner extends DisposableStore {
  private previous: PreviousTest | undefined

  constructor(private readonly ctx: Ctx) {
    super()
  }

  getPrevious(): PreviousTest | undefined {
    return this.previous
  }

  private environment(): NodeJS.ProcessEnv {
    const envFile = this.ctx.config.get('testEnvFile', '')
    let variables: Record<string, string> = {}
    if (envFile) {
      try {
        variables = parseEnvFile(readFileSync(envFile, 'utf8'))
      } catch (error) {
        window.showWarningMessage(`Unable to read go.testEnvFile ${envFile}: ${String(error)}`)
      }
    }
    return { ...variables, ...this.ctx.config.get<Record<string, string>>('testEnvVars', {}) }
  }

  async run(args: string[], cwd: string): Promise<void> {
    this.previous = { args, cwd }
    await this.ctx.terminal.runGo('test', [...this.ctx.config.testFlags(), ...args], {
      cwd,
      environment: this.environment(),
    })
    this.ctx.output.show()
  }

  // Runs `go test -json` and streams its output line by line, for callers that
  // parse results (the test explorer) as they are reported.
  async runCaptured(
    args: string[],
    cwd: string,
    onLine?: (line: string) => void,
  ): Promise<TestRunResult> {
    this.previous = { args, cwd }
    const result = await this.ctx.process.captureGo('test', ['-json', ...this.ctx.config.testFlags(), ...args], {
      cwd,
      environment: this.environment(),
      onLine,
    })
    return { code: result.code, output: result.output }
  }

  // The packages under `dir` that have test files, described by `go list` so build
  // constraints and the module graph are respected.
  async listPackages(dir: string): Promise<TestPackage[]> {
    const result = await this.ctx.process.captureGo('list', ['-f', listFormat, './...'], { cwd: dir })
    if (result.code !== 0) return []

    const packages: TestPackage[] = []
    for (const line of result.stdout.split(/\r?\n/)) {
      const [importPath, packageDir, internal, external] = line.split('\t')
      if (!importPath || !packageDir) continue
      const testFiles = [...(internal?.split(',') ?? []), ...(external?.split(',') ?? [])].filter(Boolean)
      if (testFiles.length) packages.push({ importPath, dir: packageDir, testFiles })
    }
    return packages
  }
}

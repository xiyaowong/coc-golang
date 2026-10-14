import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import type { Ctx } from '../ctx'
import { execFile, spawn } from 'node:child_process'
import { window } from 'coc.nvim'
import { DisposableStore } from '../disposable'

export interface ProcessResult {
  code: number | null
  stdout: string
  output: string
}

export interface ProcessOptions {
  cwd: string
  env?: NodeJS.ProcessEnv
  input?: string
  // Suppresses writing the process output to the Go output channel, for callers
  // that only need the captured result (e.g. machine-readable `-json` output).
  quiet?: boolean
  // Called for each line of stdout or stderr as it arrives, for callers that
  // consume output incrementally (e.g. streaming `go test -json` results).
  onLine?: (line: string) => void
}

export interface ExecFileOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
}

export interface GoRunOptions {
  cwd: string
  environment?: NodeJS.ProcessEnv
  quiet?: boolean
}

export class ProcessRunner extends DisposableStore {
  private readonly running = new Set<ChildProcess>()

  constructor(private readonly ctx: Ctx) {
    super()
  }

  killAll(): void {
    for (const process of this.running) process.kill()
    this.running.clear()
  }

  // Spawns a command and collects its output. Unless stdin is fed, stdout is also
  // streamed to the Go output channel.
  run(command: string, args: string[], options: ProcessOptions): Promise<ProcessResult> {
    const { cwd, env = process.env, input, quiet = false, onLine } = options
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        windowsHide: true,
      })
      this.running.add(child)
      let stdout = ''
      let output = ''
      let pending = ''
      child.stdout?.on('data', (chunk: Buffer) => {
        const value = chunk.toString()
        stdout += value
        output += value
        if (input === undefined && !quiet) this.ctx.output.append(value)
        if (!onLine) return
        pending += value
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() ?? ''
        for (const line of lines) onLine(line)
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        const value = chunk.toString()
        output += value
        if (!quiet) this.ctx.output.append(value)
      })
      child.once('error', (error) => {
        this.running.delete(child)
        reject(error)
      })
      child.once('close', (code) => {
        if (onLine && pending) onLine(pending)
        this.running.delete(child)
        resolve({ code, stdout, output })
      })
      if (input !== undefined) {
        child.stdin?.on('error', () => undefined)
        child.stdin?.end(input)
      }
    })
  }

  execFileText(command: string, args: string[], options: ExecFileOptions = {}): Promise<string> {
    const { cwd, env } = options
    return new Promise((resolve, reject) => {
      execFile(command, args, { cwd, env, windowsHide: true }, (error, stdout) => {
        if (error) reject(error)
        else resolve(stdout)
      })
    })
  }

  goProcess(subcommand: string, args: string[], options: GoRunOptions): Promise<ProcessResult> {
    const { cwd, environment = {}, quiet = false } = options
    this.ctx.output.header(`${this.ctx.config.goCommand()} ${subcommand} ${args.join(' ')}`)
    return this.run(this.ctx.config.goCommand(), [subcommand, ...args], {
      cwd,
      env: { ...this.ctx.environment.variables(), ...environment },
      quiet,
    })
  }

  async go(subcommand: string, args: string[], options: GoRunOptions): Promise<ProcessResult | undefined> {
    try {
      const result = await this.goProcess(subcommand, args, options)
      if (result.code !== 0) window.showErrorMessage(`go ${subcommand} exited with code ${result.code}`)
      return result
    } catch (error) {
      window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
    }
  }

  // Runs a `go` subcommand and returns its captured stdout without echoing it to
  // the output channel, for machine-readable output such as `go list -json`.
  captureGo(
    subcommand: string,
    args: string[],
    options: GoRunOptions & { onLine?: (line: string) => void },
  ): Promise<ProcessResult> {
    const { cwd, environment = {}, onLine } = options
    return this.run(this.ctx.config.goCommand(), [subcommand, ...args], {
      cwd,
      env: { ...this.ctx.environment.variables(), ...environment },
      quiet: true,
      onLine,
    })
  }

  override dispose(): void {
    this.killAll()
    super.dispose()
  }
}

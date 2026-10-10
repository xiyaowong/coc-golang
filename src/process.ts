import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import { execFile, spawn } from 'node:child_process'
import * as coc from 'coc.nvim'
import { goCommand } from './config'
import { goEnvironment } from './environment'
import { appendOutputText, showCommandOutput } from './output'

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
}

const runningProcesses = new Set<ChildProcess>()

export function killAllProcesses(): void {
  for (const process of runningProcesses) process.kill()
  runningProcesses.clear()
}

// Spawns a command and collects its output. Unless stdin is fed, stdout is also
// streamed to the Go output channel.
export function runProcess(command: string, args: string[], options: ProcessOptions): Promise<ProcessResult> {
  const { cwd, env = process.env, input, quiet = false, onLine } = options
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    runningProcesses.add(child)
    let stdout = ''
    let output = ''
    let pending = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      stdout += value
      output += value
      if (input === undefined && !quiet) appendOutputText(value)
      if (!onLine) return
      pending += value
      const lines = pending.split(/\r?\n/)
      pending = lines.pop() ?? ''
      for (const line of lines) onLine(line)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      output += value
      if (!quiet) appendOutputText(value)
    })
    child.once('error', (error) => {
      runningProcesses.delete(child)
      reject(error)
    })
    child.once('close', (code) => {
      if (onLine && pending) onLine(pending)
      runningProcesses.delete(child)
      resolvePromise({ code, stdout, output })
    })
    if (input !== undefined) {
      child.stdin?.on('error', () => undefined)
      child.stdin?.end(input)
    }
  })
}

export function execFileText(command: string, args: string[], options: ExecFileOptions = {}): Promise<string> {
  const { cwd, env } = options
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { cwd, env, windowsHide: true }, (error, stdout) => {
      if (error) reject(error)
      else resolvePromise(stdout)
    })
  })
}

export function runGoProcess(
  subcommand: string,
  args: string[],
  options: GoRunOptions,
): Promise<ProcessResult> {
  const { cwd, environment = {} } = options
  showCommandOutput(`${goCommand()} ${subcommand} ${args.join(' ')}`)
  return runProcess(goCommand(), [subcommand, ...args], {
    cwd,
    env: { ...goEnvironment(), ...environment },
  })
}

export async function runGo(
  subcommand: string,
  args: string[],
  options: GoRunOptions,
): Promise<ProcessResult | undefined> {
  try {
    const result = await runGoProcess(subcommand, args, options)
    if (result.code !== 0) coc.window.showErrorMessage(`go ${subcommand} exited with code ${result.code}`)
    return result
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
  }
}

// Runs a `go` subcommand and returns its captured stdout without echoing it to
// the output channel, for machine-readable output such as `go list -json`.
export async function captureGo(
  subcommand: string,
  args: string[],
  options: GoRunOptions & { onLine?: (line: string) => void },
): Promise<ProcessResult> {
  const { cwd, environment = {}, onLine } = options
  return runProcess(goCommand(), [subcommand, ...args], {
    cwd,
    env: { ...goEnvironment(), ...environment },
    quiet: true,
    onLine,
  })
}

import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import { execFile, spawn } from 'node:child_process'
import * as coc from 'coc.nvim'
import { goCommand } from './config'
import { goEnvironment } from './environment'
import { shellCommandLine, shellKind } from './shell-utils'

export interface ProcessResult {
  code: number | null
  stdout: string
  output: string
}

export interface ProcessOptions {
  cwd: string
  env?: NodeJS.ProcessEnv
  input?: string
}

export interface ExecFileOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
}

export interface GoRunOptions {
  cwd: string
  environment?: NodeJS.ProcessEnv
}

export interface TerminalRunOptions extends GoRunOptions {
  focus?: boolean
}

const runningProcesses = new Set<ChildProcess>()
let goTerminal: coc.Terminal | undefined
let outputChannel: coc.OutputChannel | undefined
let outputVisibilityCheck: Promise<void> | undefined

export function createOutputChannel(): coc.OutputChannel {
  outputChannel = coc.window.createOutputChannel('Go')
  return outputChannel
}

export function disposeOutputChannel(): void {
  outputChannel?.dispose()
  outputChannel = undefined
}

export function appendOutput(text: string): void {
  outputChannel?.appendLine(text)
}

export function showCommandOutput(title: string): void {
  outputChannel?.appendLine(`\n> ${title}`)
}

export function showOutput(): void {
  const channel = outputChannel
  if (!channel || outputVisibilityCheck) return

  outputVisibilityCheck = (async () => {
    const buffer = await coc.workspace.nvim.call('bufnr', [`output:///${encodeURI(channel.name)}`])
    if (typeof buffer !== 'number') throw new Error('Could not find the Go output buffer.')
    if (buffer < 0) {
      if (outputChannel === channel) channel.show()
      return
    }
    const windows = await coc.workspace.nvim.call('win_findbuf', [buffer])
    if (!Array.isArray(windows)) throw new Error('Could not determine whether the Go output is visible.')
    if (outputChannel === channel && windows.length === 0) channel.show()
  })().catch((error: unknown) => {
    coc.window.showMessage(`Failed to show Go output: ${String(error)}`, 'error')
  }).finally(() => {
    outputVisibilityCheck = undefined
  })
}

export function killAllProcesses(): void {
  for (const process of runningProcesses) process.kill()
  runningProcesses.clear()
}

export function disposeTerminal(): void {
  goTerminal?.dispose()
  goTerminal = undefined
}

export function interruptTerminal(): void {
  goTerminal?.sendText('\x03', false)
}

export async function showTerminal(): Promise<void> {
  if (!goTerminal) {
    coc.window.showWarningMessage('No Go terminal. Run a Go command first.')
    return
  }
  await goTerminal.show(true)
}

export async function runGoInTerminal(
  subcommand: string,
  args: string[],
  options: TerminalRunOptions,
): Promise<void> {
  const { cwd, environment = {}, focus = false } = options
  disposeTerminal()
  try {
    const shell = await coc.workspace.nvim.eval('&shell')
    const line = shellCommandLine(goCommand(), [subcommand, ...args], shellKind(String(shell)))
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries({ ...goEnvironment(), ...environment })) {
      if (value !== undefined) env[key] = value
    }
    const terminal = await coc.window.createTerminal({ name: 'Go', cwd, env })
    goTerminal = terminal
    terminal.sendText(line)
    await terminal.show(!focus)
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
  }
}

export function runProcess(command: string, args: string[], options: ProcessOptions): Promise<ProcessResult> {
  const { cwd, env = process.env, input } = options
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
    child.stdout?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      stdout += value
      output += value
      if (input === undefined) outputChannel?.append(value)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      output += value
      outputChannel?.append(value)
    })
    child.once('error', (error) => {
      runningProcesses.delete(child)
      reject(error)
    })
    child.once('close', (code) => {
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

export async function runGo(
  subcommand: string,
  args: string[],
  options: GoRunOptions,
): Promise<ProcessResult | undefined> {
  const { cwd, environment = {} } = options
  const fullArgs = [subcommand, ...args]
  showCommandOutput(`${goCommand()} ${fullArgs.join(' ')}`)
  try {
    const result = await runProcess(goCommand(), fullArgs, {
      cwd,
      env: { ...goEnvironment(), ...environment },
    })
    if (result.code !== 0) {
      coc.window.showErrorMessage(`go ${subcommand} exited with code ${result.code}`)
    }
    return result
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
  }
}

import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import { execFile, spawn } from 'node:child_process'
import * as coc from 'coc.nvim'
import { goCommand } from './config'
import { goEnvironment } from './environment'

export interface ProcessResult {
  code: number | null
  stdout: string
  output: string
}

const runningProcesses = new Set<ChildProcess>()
export const runningTests = new Set<ChildProcess>()
let outputChannel: coc.OutputChannel | undefined
let outputVisibilityCheck: Promise<void> | undefined

function showOutputIfNeeded(): void {
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

export function createOutputChannel(): coc.OutputChannel {
  outputChannel = coc.window.createOutputChannel('Go')
  return outputChannel
}

export function showOutput(): void {
  showOutputIfNeeded()
}

export function appendOutput(text: string): void {
  outputChannel?.appendLine(text)
}

export function killTests(): void {
  for (const process of runningTests) process.kill()
  runningTests.clear()
}

export function killAllProcesses(): void {
  for (const process of runningProcesses) process.kill()
  runningProcesses.clear()
}

export function disposeOutputChannel(): void {
  runningTests.clear()
  outputChannel?.dispose()
  outputChannel = undefined
}

export function runProcess(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  processGroup?: Set<ChildProcess>,
  input?: string,
): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    runningProcesses.add(child)
    processGroup?.add(child)
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
      processGroup?.delete(child)
      reject(error)
    })
    child.once('close', (code) => {
      runningProcesses.delete(child)
      processGroup?.delete(child)
      resolvePromise({ code, stdout, output })
    })
    if (input !== undefined) {
      child.stdin?.on('error', () => undefined)
      child.stdin?.end(input)
    }
  })
}

export function execFileText(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { env, windowsHide: true }, (error, stdout) => {
      if (error) reject(error)
      else resolvePromise(stdout)
    })
  })
}

export function showCommandOutput(title: string): void {
  outputChannel?.appendLine(`\n> ${title}`)
}

export async function runGo(
  subcommand: string,
  args: string[],
  cwd: string,
  testProcess = false,
  extraEnvironment: NodeJS.ProcessEnv = {},
  revealOutput = false,
): Promise<ProcessResult | undefined> {
  const fullArgs = [subcommand, ...args]
  showCommandOutput(`${goCommand()} ${fullArgs.join(' ')}`)
  try {
    const result = await runProcess(
      goCommand(),
      fullArgs,
      cwd,
      { ...goEnvironment(), ...extraEnvironment },
      testProcess ? runningTests : undefined,
    )
    if (result.code !== 0) {
      coc.window.showErrorMessage(`go ${subcommand} exited with code ${result.code}`)
    }
    if (revealOutput) showOutputIfNeeded()
    return result
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
  }
}

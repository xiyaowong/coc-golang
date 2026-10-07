import { execFile, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import * as coc from 'coc.nvim'
import { goCommand } from './config'
import { goEnvironment } from './environment'

export type ProcessResult = {
  code: number | null
  stdout: string
  output: string
}

const runningProcesses = new Set<ChildProcess>()
export const runningTests = new Set<ChildProcess>()
let outputChannel: coc.OutputChannel | undefined

export function createOutputChannel(): coc.OutputChannel {
  outputChannel = coc.window.createOutputChannel('Go')
  return outputChannel
}

export function showOutput(): void {
  outputChannel?.show()
}

export function appendOutput(text: string): void {
  outputChannel?.appendLine(text)
  outputChannel?.show()
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
  input?: string
): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true
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
    child.once('error', error => {
      runningProcesses.delete(child)
      processGroup?.delete(child)
      reject(error)
    })
    child.once('close', code => {
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
  outputChannel?.show()
}

export async function runGo(
  subcommand: string,
  args: string[],
  cwd: string,
  testProcess = false,
  extraEnvironment: NodeJS.ProcessEnv = {}
): Promise<ProcessResult | undefined> {
  const fullArgs = [subcommand, ...args]
  showCommandOutput(`${goCommand()} ${fullArgs.join(' ')}`)
  try {
    const result = await runProcess(
      goCommand(),
      fullArgs,
      cwd,
      { ...goEnvironment(), ...extraEnvironment },
      testProcess ? runningTests : undefined
    )
    if (result.code !== 0) {
      coc.window.showMessage(`go ${subcommand} exited with code ${result.code}`, 'error')
    }
    return result
  } catch (error) {
    coc.window.showMessage(`Failed to run go ${subcommand}: ${String(error)}`, 'error')
  }
}

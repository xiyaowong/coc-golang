import { EventEmitter } from 'node:events'

export interface RecordedCall {
  command: string
  args: string[]
  options: { cwd?: string, env?: NodeJS.ProcessEnv }
}

export interface Response {
  code?: number
  stdout?: string
  stderr?: string
}

export const spawnCalls: RecordedCall[] = []
export const execFileCalls: RecordedCall[] = []

let response: Response = {}

export function respondWith(next: Response): void {
  response = next
}

export function resetChildProcess(): void {
  spawnCalls.length = 0
  execFileCalls.length = 0
  response = {}
}

class FakeChild extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  stdin = Object.assign(new EventEmitter(), { end: (_input?: string) => undefined })
  exited = false

  kill(): void {
    this.exited = true
  }
}

export function spawn(command: string, args: string[], options: RecordedCall['options']): FakeChild {
  spawnCalls.push({ command, args, options })
  const child = new FakeChild()
  queueMicrotask(() => {
    if (response.stdout) child.stdout.emit('data', response.stdout)
    if (response.stderr) child.stderr.emit('data', response.stderr)
    child.emit('close', response.code ?? 0)
  })
  return child
}

export function execFile(
  command: string,
  args: string[],
  options: RecordedCall['options'],
  callback: (error: Error | null, stdout: string) => void,
): void {
  execFileCalls.push({ command, args, options })
  queueMicrotask(() => callback(null, ''))
}

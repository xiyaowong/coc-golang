import type { Disposable } from 'coc.nvim'
import { workspace } from 'coc.nvim'
import { DisposableStore } from './disposable'
import { scratchBuffer, setBufferLines } from './editor'
import { jsonToGo } from './json-to-go'

const jsonInputBuffer = 'json-to-go://input'
const jsonOutputBuffer = 'json-to-go://output'

interface LiveSession {
  source: number
  output: number
  sourceWindow: number
  outputWindow: number
  disposables: Disposable[]
}

function generatedLines(source: string): string[] {
  if (!source.trim()) return ['']
  const result = jsonToGo(source)
  if (result.error) return [`// json-to-go: ${result.error}`]
  return result.go.replace(/\n$/, '').split('\n')
}

async function closeWindow(winid: number): Promise<void> {
  if (winid <= 0) return
  try {
    // Close in the target window's context so the cursor does not jump.
    await workspace.nvim.call('win_execute', [winid, 'close'])
  } catch {
    // The window may already be gone.
  }
}

async function wipeBuffer(bufnr: number): Promise<void> {
  const exists = await workspace.nvim.call('bufexists', [bufnr]) as number
  if (!exists) return
  try {
    await workspace.nvim.command(`bwipeout! ${bufnr}`)
  } catch {
    // The buffer may already be gone.
  }
}

export class ConvertSession extends DisposableStore {
  private live: LiveSession | undefined
  // Writes to the output buffer are serialized: a live refresh can fire while a
  // previous one is still applying its lines, and interleaving the
  // modifiable/setLines/modifiable sequence would fail.
  private outputQueue: Promise<void> = Promise.resolve()

  private writeOutput(bufnr: number, lines: string[]): Promise<void> {
    const next = this.outputQueue.then(() => setBufferLines(bufnr, lines, true))
    this.outputQueue = next.catch(() => undefined)
    return next
  }

  // Seeds the JSON buffer and clears the modified flag.
  private async writeSource(bufnr: number, json: string): Promise<void> {
    await setBufferLines(bufnr, json.trim() ? [json.replace(/\n$/, '')] : [''])
    await workspace.nvim.createBuffer(bufnr).setOption('modified', false)
  }

  private async openScratchWindow(bufnr: number): Promise<number> {
    await workspace.nvim.command('rightbelow vsplit')
    await workspace.nvim.command(`buffer ${bufnr}`)
    return await workspace.nvim.call('win_getid', []) as number
  }

  // Ends the session: closes both scratch windows and wipes both buffers.
  async closeSession(): Promise<void> {
    const session = this.live
    if (!session) return
    this.live = undefined
    for (const disposable of session.disposables) disposable.dispose()
    await closeWindow(session.sourceWindow)
    await closeWindow(session.outputWindow)
    await wipeBuffer(session.source)
    await wipeBuffer(session.output)
  }

  // Replaces any previous session so every mode starts from a clean pair seeded
  // with `json`.
  async open(json: string): Promise<void> {
    await this.closeSession()

    const source = await scratchBuffer(jsonInputBuffer, 'json')
    const output = await scratchBuffer(jsonOutputBuffer, 'go')
    await this.writeSource(source, json)
    await this.writeOutput(output, generatedLines(json))

    const refresh = async (): Promise<void> => {
      const lines = await workspace.nvim.call('getbufline', [source, 1, '$']) as string[]
      await this.writeOutput(output, generatedLines(lines.join('\n')))
    }

    // The current window keeps its buffer; the scratch buffers open as new
    // splits, so a modified buffer in any of them is never unloaded.
    const sourceWindow = await this.openScratchWindow(source)
    const outputWindow = await this.openScratchWindow(output)
    await workspace.nvim.call('win_gotoid', [sourceWindow])

    const disposables: Disposable[] = [
      workspace.registerAutocmd({
        event: ['TextChanged', 'TextChangedI'],
        buffer: source,
        callback: () => void refresh(),
      }),
    ]
    // Closing either scratch window (or wiping its buffer) ends the session.
    for (const winid of [sourceWindow, outputWindow]) {
      disposables.push(workspace.registerAutocmd({
        event: 'WinClosed',
        pattern: String(winid),
        callback: () => void this.closeSession(),
      }))
    }
    for (const bufnr of [source, output]) {
      disposables.push(workspace.registerAutocmd({
        event: 'BufWipeout',
        buffer: bufnr,
        callback: () => void this.closeSession(),
      }))
    }
    for (const disposable of disposables) this.track(disposable)
    this.live = { source, output, sourceWindow, outputWindow, disposables }
  }

  override dispose(): void {
    void this.closeSession()
    super.dispose()
  }
}

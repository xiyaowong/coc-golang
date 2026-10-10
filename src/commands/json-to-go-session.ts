import * as coc from 'coc.nvim'
import { jsonToGo } from '../json-to-go'

const jsonInputBuffer = 'json-to-go://input'
const jsonOutputBuffer = 'json-to-go://output'

interface LiveSession {
  source: number
  output: number
  sourceWindow: number
  outputWindow: number
  disposables: coc.Disposable[]
}

// A scratch buffer the extension owns. coc.nvim is disabled for it so the
// language server never attaches and the generated code is shown as-is rather
// than as a file with errors.
async function scratchBuffer(name: string, filetype: string): Promise<number> {
  const bufnr = await coc.workspace.nvim.call('bufadd', [name]) as number
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&buftype', 'nofile'])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&bufhidden', 'hide'])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&swapfile', 0])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&filetype', filetype])
  await coc.workspace.nvim.call('setbufvar', [bufnr, 'coc_enabled', 0])
  return bufnr
}

async function setBufferLines(bufnr: number, lines: string[], readonly = false): Promise<void> {
  lines = lines.flatMap(line => line.split(/\r?\n/)).flat()
  const buffer = coc.workspace.nvim.createBuffer(bufnr)
  await buffer.setOption('modifiable', true)
  await buffer.setLines(lines.length ? lines : [''], { start: 0, end: -1, strictIndexing: false })
  await buffer.setOption('modifiable', !readonly)
}

// Writes to the output buffer are serialized: a live refresh can fire while a
// previous one is still applying its lines, and interleaving the
// modifiable/setLines/modifiable sequence would fail.
let outputQueue: Promise<void> = Promise.resolve()

function writeOutput(bufnr: number, lines: string[]): Promise<void> {
  const next = outputQueue.then(() => setBufferLines(bufnr, lines, true))
  outputQueue = next.catch(() => undefined)
  return next
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
    await coc.workspace.nvim.call('win_execute', [winid, 'close'])
  } catch {
    // The window may already be gone.
  }
}

async function wipeBuffer(bufnr: number): Promise<void> {
  const exists = await coc.workspace.nvim.call('bufexists', [bufnr]) as number
  if (!exists) return
  try {
    await coc.workspace.nvim.command(`bwipeout! ${bufnr}`)
  } catch {
    // The buffer may already be gone.
  }
}

let liveSession: LiveSession | undefined

// Ends the session: closes both scratch windows and wipes both buffers. Closing
// either window triggers this, so the session never outlives what it owns.
async function clearLiveSession(): Promise<void> {
  const session = liveSession
  if (!session) return
  liveSession = undefined
  for (const disposable of session.disposables) disposable.dispose()
  await closeWindow(session.sourceWindow)
  await closeWindow(session.outputWindow)
  await wipeBuffer(session.source)
  await wipeBuffer(session.output)
}

async function openScratchWindow(bufnr: number): Promise<number> {
  await coc.workspace.nvim.command('rightbelow vsplit')
  await coc.workspace.nvim.command(`buffer ${bufnr}`)
  return await coc.workspace.nvim.call('win_getid', []) as number
}

// Seeds the JSON buffer and clears the modified flag.
async function writeSource(bufnr: number, json: string): Promise<void> {
  await setBufferLines(bufnr, json.trim() ? [json.replace(/\n$/, '')] : [''])
  await coc.workspace.nvim.createBuffer(bufnr).setOption('modified', false)
}

// Replaces any previous session so every mode starts from a clean pair seeded
// with `json`.
export async function editLive(json: string): Promise<void> {
  await clearLiveSession()

  const source = await scratchBuffer(jsonInputBuffer, 'json')
  const output = await scratchBuffer(jsonOutputBuffer, 'go')
  await writeSource(source, json)
  await writeOutput(output, generatedLines(json))

  const refresh = async (): Promise<void> => {
    const lines = await coc.workspace.nvim.call('getbufline', [source, 1, '$']) as string[]
    await writeOutput(output, generatedLines(lines.join('\n')))
  }

  // The current window keeps its buffer; the scratch buffers open as new
  // splits, so a modified buffer in any of them is never unloaded.
  const sourceWindow = await openScratchWindow(source)
  const outputWindow = await openScratchWindow(output)
  await coc.workspace.nvim.call('win_gotoid', [sourceWindow])

  const disposables: coc.Disposable[] = [
    coc.workspace.registerAutocmd({
      event: ['TextChanged', 'TextChangedI'],
      buffer: source,
      callback: () => void refresh(),
    }),
  ]
  // Closing either scratch window (or wiping its buffer) ends the session.
  for (const winid of [sourceWindow, outputWindow]) {
    disposables.push(coc.workspace.registerAutocmd({
      event: 'WinClosed',
      pattern: String(winid),
      callback: () => void clearLiveSession(),
    }))
  }
  for (const bufnr of [source, output]) {
    disposables.push(coc.workspace.registerAutocmd({
      event: 'BufWipeout',
      buffer: bufnr,
      callback: () => void clearLiveSession(),
    }))
  }
  liveSession = { source, output, sourceWindow, outputWindow, disposables }
}

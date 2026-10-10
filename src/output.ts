import * as coc from 'coc.nvim'

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

// Appends a line to the Go output channel.
export function appendOutput(text: string): void {
  outputChannel?.appendLine(text)
}

// Appends raw process output without adding a line break.
export function appendOutputText(text: string): void {
  outputChannel?.append(text)
}

// Reports the command about to run, as a `> command` header in the output.
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

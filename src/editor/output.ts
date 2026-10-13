import type { OutputChannel as CocOutputChannel } from 'coc.nvim'
import { window, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'

export class OutputChannel extends DisposableStore {
  private readonly channel: CocOutputChannel = this.track(window.createOutputChannel('Go'))
  private visibilityCheck: Promise<void> | undefined

  // Appends raw process output without adding a line break.
  append(text: string): void {
    this.channel.append(text)
  }

  // Appends a line to the output channel.
  appendLine(text: string): void {
    this.channel.appendLine(text)
  }

  // Reports the command about to run, as a `> command` header in the output.
  header(title: string): void {
    this.channel.appendLine(`\n> ${title}`)
  }

  show(): void {
    const channel = this.channel
    if (this.visibilityCheck) return

    this.visibilityCheck = (async () => {
      const buffer = await workspace.nvim.call('bufnr', [`output:///${encodeURI(channel.name)}`])
      if (typeof buffer !== 'number') throw new Error('Could not find the Go output buffer.')
      if (buffer < 0) {
        channel.show()
        return
      }
      const windows = await workspace.nvim.call('win_findbuf', [buffer])
      if (!Array.isArray(windows)) throw new Error('Could not determine whether the Go output is visible.')
      if (windows.length === 0) channel.show()
    })().catch((error: unknown) => {
      window.showMessage(`Failed to show Go output: ${String(error)}`, 'error')
    }).finally(() => {
      this.visibilityCheck = undefined
    })
  }
}

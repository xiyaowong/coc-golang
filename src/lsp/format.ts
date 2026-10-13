import type { Disposable, TextDocument, TextEdit } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TextEdit as CocTextEdit, languages, Range, window } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { toolFailure } from '../go/tools'

export class Formatter extends DisposableStore {
  private registration: Disposable | undefined

  constructor(private readonly ctx: Ctx) {
    super()
    this.track(this.ctx.config.onDidChange((change) => {
      if (change.format) this.refresh()
    }))
  }

  refresh(): void {
    this.unregister()
    const config = this.ctx.config
    const languageServer = config.get('useLanguageServer', true)
    const tool = config.get<string>('formatTool', 'default')
    if (languageServer && tool === 'default') return

    const provider = {
      provideDocumentFormattingEdits: async (document: TextDocument): Promise<TextEdit[]> => {
        if (!document.uri.startsWith('file:')) return []
        const file = fileURLToPath(document.uri)
        const flags = config.get<string[]>('formatFlags', [])
        const resolved = tool === 'default' ? 'goimports' : tool
        const name = resolved === 'custom' ? 'customFormatter' : resolved
        const args = resolved === 'goimports' ? ['-srcdir', dirname(file), ...flags] : flags
        const text = document.getText()
        const result = await this.ctx.tools.run(name, args, { cwd: dirname(file), input: text, quiet: true })
        if (!result || result.code !== 0) {
          if (result) {
            await window.showNotification({
              kind: 'error',
              title: `${name} failed`,
              content: toolFailure(`Exit code ${result.code}`, result),
            })
          }
          return []
        }
        if (result.stdout === text) return []
        const end = document.positionAt(text.length)
        return [CocTextEdit.replace(Range.create(0, 0, end.line, end.character), result.stdout)]
      },
    }
    this.registration = languages.registerDocumentFormatProvider(['go'], provider, 100)
    this.track(this.registration)
  }

  private unregister(): void {
    this.registration?.dispose()
    this.registration = undefined
  }

  override dispose(): void {
    this.unregister()
    super.dispose()
  }
}

import type { Disposable, ExtensionContext } from 'coc.nvim'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { configValue } from './config'
import { runTool } from './tools'

let formatRegistration: Disposable | undefined

export function refreshFormatProvider(context: ExtensionContext): void {
  disposeFormatProvider()
  const languageServer = configValue('useLanguageServer', true)
  const tool = configValue<string>('formatTool', 'default')
  if (languageServer && tool === 'default') return

  const provider = {
    provideDocumentFormattingEdits: async (document: coc.TextDocument): Promise<coc.TextEdit[]> => {
      if (!document.uri.startsWith('file:')) return []
      const file = fileURLToPath(document.uri)
      const flags = configValue<string[]>('formatFlags', [])
      const resolved = tool === 'default' ? 'goimports' : tool
      const name = resolved === 'custom' ? 'customFormatter' : resolved
      const args = resolved === 'goimports' ? ['-srcdir', dirname(file), ...flags] : flags
      const text = document.getText()
      const result = await runTool(name, args, { cwd: dirname(file), input: text, quiet: true })
      if (!result || result.code !== 0) {
        if (result) coc.window.showErrorMessage(`${name} failed: ${result.output.trim().split(/\r?\n/)[0] ?? ''}`)
        return []
      }
      if (result.stdout === text) return []
      const end = document.positionAt(text.length)
      return [coc.TextEdit.replace(coc.Range.create(0, 0, end.line, end.character), result.stdout)]
    },
  }
  formatRegistration = coc.languages.registerDocumentFormatProvider(['go'], provider, 100)
  context.subscriptions.push(formatRegistration)
}

export function disposeFormatProvider(): void {
  formatRegistration?.dispose()
  formatRegistration = undefined
}

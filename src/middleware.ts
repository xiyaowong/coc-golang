import type { LanguageClientOptions } from 'coc.nvim'
import * as coc from 'coc.nvim'

export type MiddlewareHooks = NonNullable<LanguageClientOptions['middleware']>

type AnyHook = (...args: any[]) => unknown

type HookKey = Extract<{
  [K in keyof MiddlewareHooks]: MiddlewareHooks[K] extends AnyHook ? K : never
}[keyof MiddlewareHooks], PropertyKey>

type CombinedMiddleware = {
  [K in HookKey]?: (...args: any[]) => unknown
}

function isHook(value: unknown): value is AnyHook {
  return typeof value === 'function'
}

export function combineMiddleware(...layers: MiddlewareHooks[]): MiddlewareHooks {
  const combined: Record<string, AnyHook> = {}
  for (const key of Object.keys(Object.assign({}, ...layers))) {
    const hooks = layers.map(layer => (layer as Record<string, unknown>)[key]).filter(isHook)
    if (!hooks.length) continue
    combined[key] = (...args: unknown[]) => {
      const run = (index: number, callArgs: unknown[]): unknown => {
        const hook = hooks[index]
        return hook(...callArgs, (...nextArgs: unknown[]) => run(index + 1, nextArgs.length ? nextArgs : callArgs))
      }
      return run(0, args)
    }
  }
  return combined as CombinedMiddleware
}

const goLanguages = new Set(['go', 'gomod', 'gowork', 'gotmpl'])

// gopls rejects its commands while any overlay differs from disk. coc.nvim syncs
// text with '\n' line endings, so CRLF files never hash-match their disk bytes
// even when saved. Re-asserting didSave for unmodified buffers marks them saved.
async function markCleanBuffersSaved(client: coc.LanguageClient): Promise<void> {
  for (const doc of coc.workspace.documents) {
    if (!doc.attached || !goLanguages.has(doc.languageId)) continue
    const modified = await doc.buffer.getOption('modified') as boolean
    if (modified) continue
    await client.sendNotification('textDocument/didSave', { textDocument: { uri: doc.uri } })
  }
}

export function saveSyncMiddleware(getClient: () => coc.LanguageClient | undefined): MiddlewareHooks {
  return {
    executeCommand: async (command, args, next) => {
      const client = getClient()
      if (client) await markCleanBuffersSaved(client)
      return next(command, args)
    },
  }
}

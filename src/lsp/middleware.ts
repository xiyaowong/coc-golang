import type { LanguageClientOptions } from 'coc.nvim'
import * as coc from 'coc.nvim'

export type MiddlewareHooks = NonNullable<LanguageClientOptions['middleware']>

type Hook = (...args: any[]) => unknown

// Every hook receives a trailing `next` that continues the chain, so layers run
// in the order they are passed in.
function combine(entries: [string, Hook[]][]): Record<string, unknown> {
  const combined: Record<string, unknown> = {}
  for (const [key, hooks] of entries) {
    combined[key] = (...args: unknown[]) => {
      const run = (index: number, callArgs: unknown[]): unknown => {
        const hook = hooks[index]
        return hook(...callArgs, (...nextArgs: unknown[]) => run(index + 1, nextArgs.length ? nextArgs : callArgs))
      }
      return run(0, args)
    }
  }
  return combined
}

// Merges middleware layers hook by hook. A plain spread would drop every layer but
// the last for a shared hook, and would lose nested groups like `workspace`.
export function combineMiddleware(...layers: MiddlewareHooks[]): MiddlewareHooks {
  const entries = new Map<string, unknown[]>()
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      const values = entries.get(key) ?? []
      values.push(value)
      entries.set(key, values)
    }
  }

  const hooks: [string, Hook[]][] = []
  const nested = new Map<string, MiddlewareHooks[]>()
  for (const [key, values] of entries) {
    if (values.every(value => typeof value === 'function')) {
      hooks.push([key, values as Hook[]])
    } else {
      nested.set(key, values as MiddlewareHooks[])
    }
  }

  const combined = combine(hooks)
  for (const [key, values] of nested) {
    combined[key] = combineMiddleware(...values)
  }
  return combined as MiddlewareHooks
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

// Answers gopls configuration requests from the live `go.*` settings.
export function workspaceConfigurationMiddleware(readOptions: () => Record<string, unknown>): MiddlewareHooks {
  return {
    workspace: {
      configuration: async (params, token, next) => {
        const result = await next(params, token)
        if (!Array.isArray(result)) return result
        return params.items.map((item, index) => item.section === 'gopls' ? readOptions() : result[index])
      },
    },
  }
}

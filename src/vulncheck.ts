import type { LanguageClientOptions, ProgressToken } from 'coc.nvim'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { goEnvironment } from './environment'
import { appendOutput, runProcess, showCommandOutput } from './process'

interface VulncheckReport {
  Entries?: Record<string, unknown>
  Findings?: unknown[]
}

type WorkDoneProgress = coc.WorkDoneProgressBegin | coc.WorkDoneProgressReport | coc.WorkDoneProgressEnd

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function uriPath(uri: string): string {
  const path = resolve(fileURLToPath(uri))
  return process.platform === 'win32' ? path.toLowerCase() : path
}

function directoryForUri(uri: string): string {
  const path = uriPath(uri)
  return extname(path) === '.mod' ? dirname(path) : path
}

function reportInput(report: VulncheckReport): string {
  const records = [
    ...Object.values(report.Entries ?? {}).map(osv => ({ osv })),
    ...(report.Findings ?? []).map(finding => ({ finding })),
  ]
  return records.map(item => JSON.stringify(item)).join('\n')
}

async function displayReport(gopls: string, report: VulncheckReport, uri: string): Promise<void> {
  const result = await runProcess(
    gopls,
    ['vulncheck', '--', '-mode=convert', '-show=color'],
    directoryForUri(uri),
    goEnvironment(),
    undefined,
    reportInput(report),
  )
  if (result.output) appendOutput(result.output)
  if (result.code !== 0 && result.code !== 3) {
    coc.window.showMessage(`gopls vulncheck report conversion exited with code ${result.code}.`, 'error')
  }
}

function tokenFrom(value: unknown): ProgressToken | undefined {
  const token = record(value)?.Token
  return typeof token === 'string' || typeof token === 'number' ? token : undefined
}

export function vulncheckMiddleware(
  gopls: string,
  getClient: () => coc.LanguageClient | undefined,
): Pick<NonNullable<LanguageClientOptions['middleware']>, 'executeCommand' | 'handleWorkDoneProgress'> {
  const runs = new Map<ProgressToken, string>()
  const earlyProgress = new Map<ProgressToken, WorkDoneProgress[]>()
  let activeUri: string | undefined

  const fetchReport = async (uri: string): Promise<void> => {
    const client = getClient()
    if (!client) throw new Error('gopls is not running.')
    const results = await client.sendRequest<Record<string, VulncheckReport>>('workspace/executeCommand', {
      command: 'gopls.fetch_vulncheck_result',
      arguments: [{ URI: uri }],
    })
    const wantedPath = uriPath(uri)
    for (const [moduleUri, report] of Object.entries(results)) {
      if (uriPath(moduleUri) === wantedPath) {
        await displayReport(gopls, report, uri)
        return
      }
    }
    throw new Error(`gopls returned no vulnerability result for ${uri}.`)
  }

  const handleProgress = (token: ProgressToken, progress: WorkDoneProgress): void => {
    const uri = runs.get(token)
    if (!uri) {
      if (activeUri) {
        const pending = earlyProgress.get(token) ?? []
        pending.push(progress)
        earlyProgress.set(token, pending)
      }
      return
    }

    if (progress.kind === 'begin') {
      appendOutput(`\n> govulncheck ${uri}\n${progress.title}`)
    } else if (progress.kind === 'report' && progress.message) {
      appendOutput(progress.message)
    } else if (progress.kind === 'end') {
      runs.delete(token)
      earlyProgress.clear()
      if (progress.message === 'completed') {
        void fetchReport(uri).catch((error: unknown) => {
          coc.window.showMessage(`Failed to retrieve govulncheck results: ${String(error)}`, 'error')
        }).finally(() => {
          activeUri = undefined
        })
      } else {
        activeUri = undefined
        appendOutput(`govulncheck terminated without a result: ${progress.message ?? 'unknown status'}`)
      }
    }
  }

  return {
    executeCommand: async (command, args, next) => {
      const input = record(args[0])
      const uri = input?.URI
      if (command === 'gopls.run_govulncheck' && typeof uri === 'string') {
        if (activeUri) {
          coc.window.showMessage('Cannot start vulncheck while another vulncheck is in progress.', 'warning')
          return undefined
        }
        activeUri = uri
        showCommandOutput(`govulncheck -C ${directoryForUri(uri)} ./...`)
        try {
          const result = await next(command, args)
          const token = tokenFrom(result)
          if (token === undefined) {
            activeUri = undefined
            earlyProgress.clear()
            coc.window.showMessage('gopls did not return a progress token for govulncheck.', 'error')
            return result
          }
          runs.set(token, uri)
          for (const progress of earlyProgress.get(token) ?? []) handleProgress(token, progress)
          earlyProgress.clear()
          return result
        } catch (error) {
          activeUri = undefined
          earlyProgress.clear()
          coc.window.showMessage(`Failed to run govulncheck: ${String(error)}`, 'error')
          throw error
        }
      }

      const result = await next(command, args)
      if (command === 'gopls.vulncheck' && typeof uri === 'string') {
        const value = record(result)?.Result
        if (value && typeof value === 'object') {
          void displayReport(gopls, value as VulncheckReport, uri).catch((error: unknown) => {
            coc.window.showMessage(`Failed to format vulncheck results: ${String(error)}`, 'error')
          })
        }
      }
      return result
    },
    handleWorkDoneProgress: (token, progress, next) => {
      handleProgress(token, progress)
      next(token, progress)
    },
  }
}

import type { Disposable } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { execFileText } from '../editor/process'
import { configValue, goCommand } from '../go/config'
import { goEnvironment } from '../go/environment'
import { toolExecutable } from '../go/tools'
import { getClient } from './language-server'

let item: coc.StatusBarItem | undefined
let stateSubscription: Disposable | undefined
let version: string | undefined

function render(): void {
  if (!item) return
  const label = version ? ` ${version}` : ''
  if (getClient()?.isRunning()) {
    item.text = `gopls${label}`
  } else {
    item.text = getClient() ? 'gopls stopped' : 'gopls not found'
  }
  item.show()
}

export function updateStatusBar(): void {
  stateSubscription?.dispose()
  stateSubscription = getClient()?.onDidChangeState(() => render())
  render()
}

async function resolveVersion(): Promise<void> {
  try {
    const executable = await toolExecutable('gopls')
    if (!executable) return
    const output = await execFileText(goCommand(), ['version', '-m', executable], { env: goEnvironment() })
    const match = /^\s*mod\s+\S+\s+(v\S+)/m.exec(output)
    if (match) version = match[1]
  } catch {
    // gopls is unavailable or `go` failed; the item falls back to showing no version.
  }
}

export function createStatusBar(): Disposable {
  if (!configValue('statusBar.enable', true)) return { dispose: () => undefined }

  item = coc.window.createStatusBarItem(0)
  updateStatusBar()
  void resolveVersion().then(render)
  return {
    dispose: () => {
      stateSubscription?.dispose()
      stateSubscription = undefined
      item?.dispose()
      item = undefined
    },
  }
}

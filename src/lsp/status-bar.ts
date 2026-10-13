import type { Disposable, StatusBarItem } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { window } from 'coc.nvim'
import { DisposableStore } from '../disposable'

export class StatusBar extends DisposableStore {
  private item: StatusBarItem | undefined
  private stateSubscription: Disposable | undefined
  private version: string | undefined

  constructor(private readonly ctx: Ctx) {
    super()
  }

  private render(): void {
    if (!this.item) return
    const client = this.ctx.languageServer.getClient()
    const label = this.version ? ` ${this.version}` : ''
    this.item.text = client?.isRunning() ? `gopls${label}` : client ? 'gopls stopped' : 'gopls not found'
    this.item.show()
  }

  update(): void {
    this.stateSubscription?.dispose()
    this.stateSubscription = this.ctx.languageServer.getClient()?.onDidChangeState(() => this.render())
    this.render()
  }

  private async resolveVersion(): Promise<void> {
    try {
      const executable = await this.ctx.tools.executable('gopls')
      if (!executable) return
      const output = await this.ctx.process.execFileText(
        this.ctx.config.goCommand(),
        ['version', '-m', executable],
        { env: this.ctx.environment.variables() },
      )
      const match = /^\s*mod\s+\S+\s+(v\S+)/m.exec(output)
      if (match) this.version = match[1]
    } catch {
      // gopls is unavailable or `go` failed; the item falls back to showing no version.
    }
  }

  async start(): Promise<void> {
    if (!this.ctx.config.get('statusBar.enable', true)) return
    this.item = window.createStatusBarItem(0)
    this.track(this.item)
    this.update()
    void this.resolveVersion().then(() => this.render())
  }

  override dispose(): void {
    this.stateSubscription?.dispose()
    this.stateSubscription = undefined
    super.dispose()
  }
}

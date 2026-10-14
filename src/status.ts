import type { Disposable, StatusBarItem } from 'coc.nvim'
import type { Ctx } from './ctx'
import { window } from 'coc.nvim'
import { DisposableStore } from './disposable'

// How long a task may run before it reaches the status bar. Commands that finish
// sooner never show, so the bar reports work the user waits on rather than
// flickering through every step.
const revealDelay = 150

// What the status bar calls each kind of work. Only the long commands have a
// label, so querying commands like `go list` and `go env` stay out of the bar.
export const taskLabels = {
  build: 'building',
  vet: 'vetting',
  lint: 'linting',
  test: 'testing',
  generate: 'generating',
  install: 'installing',
  modules: 'modules',
  search: 'searching packages',
}

interface Task {
  count: number
  visible: boolean
  timer?: ReturnType<typeof setTimeout>
}

// The extension's single status bar. Modules contribute their state through
// `begin`, which keeps one entry per label and drops it when the last holder
// releases it, so overlapping work shows one entry and no entry outlives its task.
export class StatusBar extends DisposableStore {
  private item: StatusBarItem | undefined
  private stateSubscription: Disposable | undefined
  private version: string | undefined
  private readonly tasks = new Map<string, Task>()

  constructor(private readonly ctx: Ctx) {
    super()
    this.ctx.languageServer.onDidReplaceClient = () => this.update()
  }

  // Shows `label` until the returned function is called. A label of `undefined`
  // means the work is not worth reporting, and nothing is shown.
  begin(label: string | undefined): () => void {
    if (!label) return () => undefined
    let task = this.tasks.get(label)
    if (!task) {
      const created: Task = { count: 0, visible: false }
      task = created
      this.tasks.set(label, created)
      created.timer = setTimeout(() => {
        created.timer = undefined
        created.visible = true
        this.render()
      }, revealDelay)
      created.timer.unref?.()
    }
    task.count++
    let released = false
    return () => {
      if (released) return
      released = true
      task.count--
      if (task.count > 0) return
      if (task.timer) clearTimeout(task.timer)
      this.tasks.delete(label)
      this.render()
    }
  }

  // Runs `work` with `label` shown for as long as it takes.
  async during<T>(label: string | undefined, work: Promise<T>): Promise<T> {
    const done = this.begin(label)
    try {
      return await work
    } finally {
      done()
    }
  }

  private gopls(): string {
    if (!this.ctx.config.get('useLanguageServer', true)) return ''
    const client = this.ctx.languageServer.getClient()
    if (!client) return 'gopls not found'
    if (!client.isRunning()) return 'gopls stopped'
    return this.version ? `gopls ${this.version}` : 'gopls'
  }

  private render(): void {
    if (!this.item) return
    const labels = [...this.tasks].filter(([, task]) => task.visible).map(([label]) => label)
    const text = [...labels, this.gopls()].filter(Boolean).join(' · ')
    this.item.text = text
    // The spinner means work is in progress, so an idle status bar stays still.
    this.item.isProgress = labels.length > 0
    if (text) this.item.show()
    else this.item.hide()
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
    for (const task of this.tasks.values()) {
      if (task.timer) clearTimeout(task.timer)
    }
    this.tasks.clear()
    this.stateSubscription?.dispose()
    this.stateSubscription = undefined
    super.dispose()
  }
}

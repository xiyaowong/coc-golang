import type { Disposable } from 'coc.nvim'
import { disposeAll } from 'coc.nvim'

export class DisposableStore implements Disposable {
  private readonly disposables: Disposable[] = []

  track<T extends Disposable>(disposable: T): T {
    this.disposables.push(disposable)
    return disposable
  }

  // Released in reverse, so what was built on top of something else is torn down first.
  dispose(): void {
    disposeAll(this.disposables.reverse())
  }
}

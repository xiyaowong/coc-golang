import type { Disposable } from 'coc.nvim'
import { commands } from 'coc.nvim'
import { DisposableStore } from '../disposable'

export class CommandManager extends DisposableStore {
  private readonly registered = new Map<string, Disposable>()

  handle = (id: string, callback: (...args: any[]) => unknown): Disposable => {
    const existing = this.registered.get(id)
    if (existing) return existing
    const registration = this.track(commands.registerCommand(id, callback))
    this.registered.set(id, registration)
    return registration
  }
}

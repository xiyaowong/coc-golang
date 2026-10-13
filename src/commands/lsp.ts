import type { Ctx } from '../ctx'
import { commands } from 'coc.nvim'

export class LspCommands {
  constructor(private readonly ctx: Ctx) {}

  register(): void {
    this.ctx.commands.handle('go.import.organize', async () => {
      await commands.executeCommand('editor.action.organizeImport')
    })
    this.ctx.commands.handle('go.languageserver.restart', () => this.ctx.languageServer.restart())
  }
}

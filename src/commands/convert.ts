import type { Ctx } from '../ctx'

export class ConvertCommands {
  constructor(private readonly ctx: Ctx) {}

  register(): void {
    this.ctx.commands.handle('go.convert.jsonSchema', () => this.ctx.converter.fromJsonSchema())
    this.ctx.commands.handle('go.convert.jsonToGo', () => this.ctx.converter.fromJson())
  }
}

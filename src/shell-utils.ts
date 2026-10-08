export type ShellKind = 'posix' | 'powershell' | 'cmd'

export function shellKind(shell: string): ShellKind {
  const name = shell.trim().replace(/^.*[\\/]/, '').toLowerCase().replace(/\.exe$/, '')
  if (name === 'pwsh' || name === 'powershell') return 'powershell'
  if (name === 'cmd') return 'cmd'
  return 'posix'
}

export function quoteShellArg(arg: string, kind: ShellKind): string {
  if (kind === 'cmd') {
    return /^[\w@%+=:,./\\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '""')}"`
  }
  if (kind === 'powershell') return `'${arg.replace(/'/g, `''`)}'`
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`
}

export function shellCommandLine(command: string, args: string[], kind: ShellKind): string {
  const line = [command, ...args].map(arg => quoteShellArg(arg, kind)).join(' ')
  return kind === 'powershell' ? `& ${line}` : line
}

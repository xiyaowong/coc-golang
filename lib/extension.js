'use strict'

const path = require('path')
const { spawn } = require('child_process')
const { testArgumentsAtCursor, testArgumentsForFile } = require('./go-test-utils')

const RESTART_SETTINGS = [
  'go.goplsPath',
  'go.goplsArgs',
  'go.goplsEnv',
  'go.goplsOptions',
  'go.goEnv',
]

let client

function setting(configuration, name, fallback) {
  const value = configuration.get(name, fallback)
  return value === undefined || value === null ? fallback : value
}

function runProcess(command, args, options, output) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', chunk => output.append(chunk.toString()))
    child.stderr.on('data', chunk => output.append(chunk.toString()))
    child.once('error', reject)
    child.once('close', code => resolve(code))
  })
}

async function restartClient() {
  if (!client) return
  if (client.needsStop()) await client.stop()
  client.restart()
}

async function activate(context) {
  const coc = require('coc.nvim')
  const { commands, services, window, workspace, LanguageClient } = coc
  const config = workspace.getConfiguration('go')
  const output = window.createOutputChannel('Go')
  let previousTest

  const goCommand = () => setting(config, 'goPath', 'go')
  const goEnv = () => ({ ...process.env, ...setting(config, 'goEnv', {}) })

  const runGo = async (subcommand, args, cwd, remember = false) => {
    if (remember) previousTest = { args, cwd }
    output.appendLine(`> ${goCommand()} ${subcommand} ${args.join(' ')}`)
    output.show()
    try {
      const code = await runProcess(goCommand(), [subcommand, ...args], { cwd, env: goEnv() }, output)
      if (code !== 0) {
        window.showMessage(`go ${subcommand} exited with code ${code}`, 'error')
      }
    } catch (error) {
      window.showMessage(`Failed to run go ${subcommand}: ${error.message}`, 'error')
    }
  }

  const runTest = (args, cwd) => runGo('test', args, cwd, true)

  const currentFile = async () => {
    const file = await workspace.nvim.eval('expand("%:p")')
    return typeof file === 'string' && file.length > 0 ? file : undefined
  }

  const currentDirectory = async () => {
    const file = await currentFile()
    return file ? path.dirname(file) : workspace.cwd
  }

  context.subscriptions.push(
    commands.registerCommand('go.test.package', async () => {
      await runTest(setting(config, 'testFlags', []), await currentDirectory())
    }),
    commands.registerCommand('go.test.workspace', async () => {
      await runTest([...setting(config, 'testFlags', []), './...'], workspace.cwd)
    }),
    commands.registerCommand('go.test.file', async () => {
      const lines = await workspace.nvim.eval('getline(1, "$")')
      const testArgs = testArgumentsForFile(lines)
      if (!testArgs) {
        window.showMessage('No Go tests or examples found in the current file.', 'warning')
        return
      }
      await runTest([...setting(config, 'testFlags', []), ...testArgs], await currentDirectory())
    }),
    commands.registerCommand('go.test.cursor', async () => {
      const lines = await workspace.nvim.eval('getline(1, line("."))')
      const testArgs = testArgumentsAtCursor(lines)
      if (!testArgs) {
        window.showMessage('No Go test, benchmark, or example found on the current line.', 'warning')
        return
      }
      await runTest([...setting(config, 'testFlags', []), ...testArgs], await currentDirectory())
    }),
    commands.registerCommand('go.test.previous', async () => {
      if (!previousTest) {
        window.showMessage('No previous Go test command.', 'warning')
        return
      }
      await runTest(previousTest.args, previousTest.cwd)
    }),
    commands.registerCommand('go.benchmark.package', async () => {
      await runTest([...setting(config, 'testFlags', []), '-run', '^$', '-bench', '.'], await currentDirectory())
    }),
    commands.registerCommand('go.benchmark.file', async () => {
      const lines = await workspace.nvim.eval('getline(1, "$")')
      const benchmarkArgs = testArgumentsForFile(lines, true)
      if (!benchmarkArgs) {
        window.showMessage('No Go benchmarks found in the current file.', 'warning')
        return
      }
      await runTest([...setting(config, 'testFlags', []), ...benchmarkArgs], await currentDirectory())
    }),
    commands.registerCommand('go.test.coverage', async () => {
      await runTest([...setting(config, 'testFlags', []), '-cover'], await currentDirectory())
    }),
    commands.registerCommand('go.build.package', async () => {
      await runGo('build', ['.'], await currentDirectory())
    }),
    commands.registerCommand('go.vet.package', async () => {
      await runGo('vet', ['.'], await currentDirectory())
    }),
    commands.registerCommand('go.run', async () => {
      await runGo('run', ['.'], await currentDirectory())
    }),
    commands.registerCommand('go.env', async () => {
      output.appendLine(`> ${goCommand()} env`)
      output.show()
      try {
        const code = await runProcess(goCommand(), ['env'], { cwd: workspace.cwd, env: goEnv() }, output)
        if (code !== 0) window.showMessage(`go env exited with code ${code}`, 'error')
      } catch (error) {
        window.showMessage(`Failed to run go env: ${error.message}`, 'error')
      }
    }),
    commands.registerCommand('go.gopath', async () => {
      await showGoEnvironment('GOPATH')
    }),
    commands.registerCommand('go.goroot', async () => {
      await showGoEnvironment('GOROOT')
    }),
    commands.registerCommand('go.gopls.install', async () => {
      output.appendLine('> go install golang.org/x/tools/gopls@latest')
      output.show()
      try {
        const code = await runProcess(
          goCommand(),
          ['install', 'golang.org/x/tools/gopls@latest'],
          { cwd: workspace.cwd, env: goEnv() },
          output
        )
        if (code !== 0) {
          window.showMessage(`gopls installation exited with code ${code}`, 'error')
        } else {
          window.showMessage('gopls installed successfully.')
          await restartClient()
        }
      } catch (error) {
        window.showMessage(`Failed to install gopls: ${error.message}`, 'error')
      }
    })
  )

  async function showGoEnvironment(name) {
    try {
      const { execFile } = require('child_process')
      const value = await new Promise((resolve, reject) => {
        execFile(goCommand(), ['env', name], { cwd: workspace.cwd, env: goEnv() }, (error, stdout) => {
          if (error) reject(error)
          else resolve(stdout.trim())
        })
      })
      window.showMessage(`${name}: ${value}`, 'more')
    } catch (error) {
      window.showMessage(`Failed to read ${name}: ${error.message}`, 'error')
    }
  }

  const server = () => spawn(
    setting(config, 'goplsPath', 'gopls'),
    setting(config, 'goplsArgs', []),
    {
      cwd: workspace.cwd,
      env: { ...goEnv(), ...setting(config, 'goplsEnv', {}) },
    }
  )
  client = new LanguageClient('go', 'gopls', server, {
    documentSelector: ['go', 'gomod', 'gowork'],
    initializationOptions: () => setting(config, 'goplsOptions', {}),
  })

  context.subscriptions.push(
    services.registerLanguageClient(client),
    workspace.onDidChangeConfiguration(async event => {
      if (!RESTART_SETTINGS.some(name => event.affectsConfiguration(name))) return
      await restartClient()
    }),
    output
  )
}

async function deactivate() {
  const current = client
  client = undefined
  if (current && current.needsStop()) await current.stop()
}

module.exports = { activate, deactivate }

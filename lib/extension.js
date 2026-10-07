'use strict'

const path = require('path')
const { spawn } = require('child_process')
const { testArgumentsAtCursor } = require('./go-test-utils')

const RESTART_SETTINGS = [
  'go.goplsPath',
  'go.goplsArgs',
  'go.goplsEnv',
  'go.goplsOptions',
]

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

async function activate(context) {
  const coc = require('coc.nvim')
  const { commands, services, window, workspace, LanguageClient } = coc
  const config = workspace.getConfiguration('go')
  const output = window.createOutputChannel('Go')
  let previousTest
  let client

  const runTest = async (args, cwd) => {
    previousTest = { args, cwd }
    output.appendLine(`> go test ${args.join(' ')}`)
    output.show()
    try {
      const code = await runProcess('go', ['test', ...args], { cwd }, output)
      if (code !== 0) {
        window.showMessage(`go test exited with code ${code}`, 'error')
      }
    } catch (error) {
      window.showMessage(`Failed to run go test: ${error.message}`, 'error')
    }
  }

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
    commands.registerCommand('go.gopls.install', async () => {
      output.appendLine('> go install golang.org/x/tools/gopls@latest')
      output.show()
      try {
        const code = await runProcess(
          'go',
          ['install', 'golang.org/x/tools/gopls@latest'],
          { cwd: workspace.cwd, env: process.env },
          output
        )
        if (code !== 0) {
          window.showMessage(`gopls installation exited with code ${code}`, 'error')
        } else {
          window.showMessage('gopls installed successfully.')
          await client.stop()
          client.restart()
        }
      } catch (error) {
        window.showMessage(`Failed to install gopls: ${error.message}`, 'error')
      }
    })
  )

  const server = () => spawn(
    setting(config, 'goplsPath', 'gopls'),
    setting(config, 'goplsArgs', []),
    {
      cwd: workspace.cwd,
      env: { ...process.env, ...setting(config, 'goplsEnv', {}) },
    }
  )
  client = new LanguageClient('go', 'gopls', server, {
    documentSelector: ['go', 'gomod', 'gowork'],
    initializationOptions: () => setting(config, 'goplsOptions', {}),
  })

  context.subscriptions.push(
    services.registLanguageClient(client),
    workspace.onDidChangeConfiguration(async event => {
      if (!RESTART_SETTINGS.some(name => event.affectsConfiguration(name))) return
      await client.stop()
      client.restart()
    }),
    output
  )
}

module.exports = { activate }

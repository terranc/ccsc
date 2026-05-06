#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { render } from 'ink';
import React from 'react';
import { Command } from 'commander';
import { App } from './ui/App.js';
import { getProviders, isDbAvailable } from './db.js';
import { loadHistory, saveToHistory, sortByHistory } from './history.js';
import { createProviderSettings, clearAllCcscSettings } from './settings.js';
import type { Provider } from './types.js';

const program = new Command();

program
  .name('ccsc')
  .description('Cross-platform CLI for CC Switch provider selection')
  .version('1.0.0')
  .option('--clear', 'Clear all CCSC-generated settings files')
  .option('--cli <name>', 'Specify CLI tool to use (overrides CC_CLI_PATH env)')
  .allowUnknownOption()
  .allowExcessArguments()
  .passThroughOptions()
  .action(async (options) => {
    try {
      // Handle --clear flag
      if (options.clear) {
        const removed = await clearAllCcscSettings();
        if (removed > 0) {
          console.log(`✓ Cleared ${removed} CCSC settings file(s)`);
        } else {
          console.log('No CCSC settings files found');
        }
        process.exit(0);
      }

      // Extract --cli option and remaining args
      const cliOverride = options.cli;
      const rawArgs = process.argv.slice(2).filter(
        (arg) => arg !== '--clear' && !arg.startsWith('--cli') && arg !== cliOverride
      );
      await main(rawArgs, cliOverride);
    } catch (error) {
      console.error(
        'Error:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse();

async function main(claudeArgs: string[], cliOverride?: string): Promise<void> {
  if (!isDbAvailable()) {
    console.error('CC Switch database not found.');
    console.error(
      'Please ensure CC Switch is installed and has been run at least once.'
    );
    process.exit(1);
  }

  const providers = getProviders();

  if (providers.length === 0) {
    console.error('No Claude providers found in CC Switch.');
    console.error('Please add providers in CC Switch first.');
    process.exit(1);
  }

  // Sort by history
  const history = await loadHistory();
  const sortedProviders = sortByHistory(providers, history);

  // Render Ink UI and wait for selection
  const selectedProvider = await new Promise<Provider>((resolve, reject) => {
    const { unmount } = render(
      React.createElement(App, {
        providers: sortedProviders,
        onSelect: (provider: Provider) => {
          unmount();
          resolve(provider);
        },
      })
    );
  });

  // Save to history
  await saveToHistory(selectedProvider.name);

  // Create provider-specific settings file with merged env
  const settingsPath = await createProviderSettings(
    selectedProvider.name,
    selectedProvider.envVars,
    selectedProvider.settingsConfig
  );

  // Build claude args with --settings parameter
  const finalArgs = [`--settings=${settingsPath}`, ...claudeArgs];

  // Spawn claude process
  console.log(`🚀 Starting Claude with provider: ${selectedProvider.name}`);

  // Priority: --cli option > CC_CLI_PATH env var > 'claude' default
  const claudeBin = cliOverride || process.env.CC_CLI_PATH || 'claude';

  // Spawn through the user's interactive shell (`$SHELL -i -c`) so that:
  // 1. PATH and rc-file tooling load as if the user typed the command themselves
  // 2. Child processes (MCP servers that need `node`/`npx`) find their deps
  //
  // Problem: version managers (volta/nvm/asdf) can inject shim paths that shadow
  // the user's intended `claude` binary. We solve this by resolving `claude` to
  // its canonical path via the user's LOGIN shell (which reflects their intended
  // PATH without version-manager injection from the current process tree), then
  // spawning that absolute path inside an interactive shell (so children still
  // get the full environment).
  const userShell = process.env.SHELL;

  // Resolve claude to absolute path: start a clean login shell (env -i strips
  // inherited PATH pollution from version managers) and let it rebuild PATH
  // from rc files, then `which` the binary. This finds the claude the user
  // actually intends to run, regardless of what ccsc's own process tree injected.
  let resolvedBin = claudeBin;
  if (userShell && !claudeBin.includes('/')) {
    try {
      const result = execSync(
        `env -i HOME="${process.env.HOME}" SHELL="${userShell}" TERM="${process.env.TERM || 'xterm-256color'}" ${userShell} -l -i -c 'which ${claudeBin}'`,
        { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      if (result && !result.includes('not found')) {
        resolvedBin = result;
      }
    } catch {
      // Fall through with original name
    }
  }

  const child = userShell
    ? spawn(
        userShell,
        ['-i', '-c', 'exec "$@"', 'ccsc', resolvedBin, ...finalArgs],
        { stdio: 'inherit' }
      )
    : spawn(resolvedBin, finalArgs, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });

  child.on('error', (err) => {
    console.error(`Failed to start ${claudeBin}:`, err.message);
    console.error('Please ensure Claude CLI is installed and in your PATH.');
    console.error('You can set CC_CLI_PATH environment variable or use --cli option to specify a custom CLI.');
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

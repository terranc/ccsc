#!/usr/bin/env node

import { spawn } from 'child_process';
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

  const child = spawn(claudeBin, finalArgs, {
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

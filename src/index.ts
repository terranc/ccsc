#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { render } from 'ink';
import React from 'react';
import { Command } from 'commander';
import { App } from './ui/App.js';
import { getProviders, isDbAvailable } from './db.js';
import { loadHistory, saveToHistory, sortByHistory } from './history.js';
import { createProviderSettings, clearAllCcscSettings } from './settings.js';
import { createProviderConfig, clearAllCcscCodexConfigs } from './codex-settings.js';
import type { Provider, AppType } from './types.js';
import { checkForUpdates, printUpdateNotification } from './update-check.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('ccsc')
  .description('Cross-platform CLI for CC Switch provider selection')
  .version(pkg.version)
  .option('--clear', 'Clear all CCSC-generated config files')
  .enablePositionalOptions();

/**
 * Shared action for both claude and codex subcommands
 */
async function runWithType(type: AppType, args: string[], options: Record<string, string>) {
  try {
    if (options.clear) {
      const claudeRemoved = await clearAllCcscSettings();
      const codexRemoved = await clearAllCcscCodexConfigs();
      const total = claudeRemoved + codexRemoved;
      if (total > 0) {
        console.log(`✓ Cleared ${total} CCSC config file(s)`);
      } else {
        console.log('No CCSC config files found');
      }
      process.exit(0);
    }

    // Filter out ccsc's own flags, pass rest to target CLI
    const rawArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--clear') continue;
      rawArgs.push(arg);
    }
    await main(rawArgs, type);
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Default: ccsc → claude
program
  .allowUnknownOption()
  .allowExcessArguments()
  .passThroughOptions()
  .action(async (options) => {
    await runWithType('claude', process.argv.slice(2), options);
  });

// Subcommand: ccsc claude
program
  .command('claude')
  .description('Launch Claude Code with provider selection')
  .allowUnknownOption()
  .allowExcessArguments()
  .passThroughOptions()
  .action(async () => {
    const idx = process.argv.indexOf('claude');
    const args = process.argv.slice(idx + 1);
    await runWithType('claude', args, program.opts());
  });

// Subcommand: ccsc codex
program
  .command('codex')
  .description('Launch Codex CLI with provider selection')
  .allowUnknownOption()
  .allowExcessArguments()
  .passThroughOptions()
  .action(async () => {
    const idx = process.argv.indexOf('codex');
    const args = process.argv.slice(idx + 1);
    await runWithType('codex', args, program.opts());
  });

program.parse();

async function main(args: string[], type: AppType = 'claude'): Promise<void> {
  // Check for updates before anything else
  const latestVersion = checkForUpdates();
  if (latestVersion) {
    printUpdateNotification(latestVersion);
  }

  if (!isDbAvailable()) {
    console.error('CC Switch database not found.');
    console.error(
      'Please ensure CC Switch is installed and has been run at least once.'
    );
    process.exit(1);
  }

  const providers = getProviders(type);

  if (providers.length === 0) {
    console.error(`No ${type} providers found in CC Switch.`);
    console.error('Please add providers in CC Switch first.');
    process.exit(1);
  }

  // Sort by history
  const history = await loadHistory();
  const sortedProviders = sortByHistory(providers, history);

  // Render Ink UI and wait for selection
  const selectedProvider = await new Promise<Provider>((resolve) => {
    const { unmount } = render(
      React.createElement(App, {
        providers: sortedProviders,
        onSelect: (provider: Provider) => {
          if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
            process.stdin.setRawMode(false);
          }
          unmount();
          resolve(provider);
        },
      })
    );
  });

  // Save to history
  await saveToHistory(selectedProvider.name, type);

  if (type === 'codex') {
    await launchCodex(selectedProvider, args);
  } else {
    await launchClaude(selectedProvider, args);
  }
}

/**
 * Launch Claude Code with the selected provider
 */
async function launchClaude(provider: Provider, claudeArgs: string[]): Promise<void> {
  const settingsPath = await createProviderSettings(
    provider.name,
    provider.envVars,
    provider.settingsConfig
  );

  const finalArgs = [`--settings=${settingsPath}`, ...claudeArgs];

  console.log(`🚀 Starting Claude with provider: ${provider.name}`);

  await spawnCli('claude', finalArgs, provider.envVars);
}

/**
 * Launch Codex CLI with the selected provider
 *
 * Uses CODEX_HOME isolation: each provider gets its own directory
 * under ~/.ccsc/codex-{slug}/ containing auth.json + config.toml.
 */
async function launchCodex(provider: Provider, codexArgs: string[]): Promise<void> {
  const config = provider.settingsConfig;
  const authVars = getRecord(config.auth) || {};
  const configToml = typeof config.config === 'string' ? config.config : '';

  const codexHome = await createProviderConfig(provider.name, configToml, authVars);

  console.log(`🚀 Starting Codex with provider: ${provider.name}`);

  await spawnCli('codex', codexArgs, { CODEX_HOME: codexHome });
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

/**
 * Spawn a CLI process through the user's login shell
 */
async function spawnCli(bin: string, args: string[], envVars: Record<string, string>): Promise<void> {
  const userShell = process.env.SHELL;

  // Resolve binary to absolute path via login shell
  let resolvedBin = bin;
  if (userShell && !bin.includes('/')) {
    try {
      const result = execSync(
        `env -i HOME="${process.env.HOME}" SHELL="${userShell}" TERM="${process.env.TERM || 'xterm-256color'}" ${userShell} -l -c 'which ${bin}'`,
        { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      if (result && !result.includes('not found')) {
        resolvedBin = result;
      }
    } catch {
      // Fall through with original name
    }
  }

  // Merge auth env vars into process env
  const spawnEnv = { ...process.env, ...envVars };

  const child = userShell
    ? spawn(
        userShell,
        ['-l', '-c', 'exec "$@"', 'ccsc', resolvedBin, ...args],
        { stdio: 'inherit', env: spawnEnv }
      )
    : spawn(resolvedBin, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: spawnEnv,
      });

  child.on('error', (err) => {
    console.error(`Failed to start ${bin}:`, err.message);
    console.error(`Please ensure ${bin} is installed and in your PATH.`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

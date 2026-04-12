import NodeSqlite from 'node-sqlite3-wasm';
const { Database } = NodeSqlite;
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';
import type { Provider, ProviderRow } from './types.js';

/**
 * Get the CC Switch database path
 * Priority:
 * 1. CC_SWITCH_DB_PATH environment variable (full path to database file)
 * 2. CC_SWITCH_HOME environment variable (custom config directory)
 * 3. Default: ~/.cc-switch/cc-switch.db
 */
function getDbPath(): string {
  // 1. Full path to database file
  const dbPathEnv = process.env.CC_SWITCH_DB_PATH;
  if (dbPathEnv) {
    return dbPathEnv;
  }

  // 2. Custom config directory
  const homeEnv = process.env.CC_SWITCH_HOME;
  if (homeEnv) {
    return path.join(homeEnv, 'cc-switch.db');
  }

  // 3. Default path
  const homeDir = os.homedir();
  return path.join(homeDir, '.cc-switch', 'cc-switch.db');
}

/**
 * Check if CC Switch database exists
 */
export function isDbAvailable(): boolean {
  const dbPath = getDbPath();
  return existsSync(dbPath);
}

/**
 * Get common config env from settings table
 */
function getCommonConfigEnv(): Record<string, string> {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) return {};

  const db = new Database(dbPath);
  try {
    const row = db.get(
      "SELECT value FROM settings WHERE key = 'common_config_claude'"
    ) as { value: string } | undefined;

    if (!row) return {};

    const config = JSON.parse(row.value);
    return config.env || {};
  } catch {
    return {};
  } finally {
    db.close();
  }
}

/**
 * Get common config for a given app type
 */
export function getCommonConfig(appType: string = 'claude'): Record<string, unknown> {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) return {};

  const db = new Database(dbPath);
  try {
    const row = db.get(
      "SELECT value FROM settings WHERE key = ?",
      [`common_config_${appType}`]
    ) as { value: string } | undefined;

    if (!row) return {};
    return JSON.parse(row.value);
  } catch {
    return {};
  } finally {
    db.close();
  }
}

/**
 * Get all Claude providers from CC Switch database
 */
export function getProviders(): Provider[] {
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    throw new Error(
      `CC Switch database not found at: ${dbPath}\n` +
        'Please ensure CC Switch is installed and has been run at least once.'
    );
  }

  const db = new Database(dbPath);
  const commonEnv = getCommonConfigEnv();

  try {
    const rows = db.all(
      `SELECT id, name, settings_config
       FROM providers
       WHERE app_type = 'claude'
       ORDER BY name`
    ) as unknown as ProviderRow[];

    return rows.map((row) => parseProvider(row, commonEnv));
  } finally {
    db.close();
  }
}

/**
 * Parse a database row into a Provider object
 */
function parseProvider(
  row: ProviderRow,
  commonEnv: Record<string, string>
): Provider {
  let config: { env?: Record<string, string>; [key: string]: unknown } = {};

  try {
    config = JSON.parse(row.settings_config || '{}');
  } catch {
    // Ignore parse errors
  }

  // Provider env overrides common config
  const mergedEnv = { ...commonEnv, ...(config.env || {}) };

  return {
    id: row.id,
    name: row.name,
    displayName: row.name,
    envVars: mergedEnv,
    settingsConfig: config,
  };
}

/**
 * Get a provider by name
 */
export function getProviderByName(name: string): Provider | undefined {
  const providers = getProviders();
  return providers.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
}

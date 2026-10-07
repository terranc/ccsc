import { copyFile, readFile, writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { getCommonConfig } from './db.js';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const DEFAULT_SETTINGS = path.join(CLAUDE_DIR, 'settings.json');

// Pattern for CCSC-generated settings files
const CCSC_SETTINGS_PATTERN = /^ccsc-[a-z0-9_-]+\.settings\.json$/;

export interface ClaudeSettings {
  env?: Record<string, string>;
  model?: string;
  [key: string]: unknown;
}

/**
 * Ensure ~/.claude directory exists
 */
async function ensureClaudeDir(): Promise<void> {
  if (!existsSync(CLAUDE_DIR)) {
    await mkdir(CLAUDE_DIR, { recursive: true });
  }
}

/**
 * Read settings.json file
 */
async function readSettings(filePath: string): Promise<ClaudeSettings> {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Write settings.json file
 */
async function writeSettings(
  filePath: string,
  settings: ClaudeSettings
): Promise<void> {
  const content = JSON.stringify(settings, null, 2);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Convert provider name to a valid filename slug
 * Keeps readable characters, replaces special chars with underscore
 *
 * Examples:
 *   "JDCloud" -> "jdcloud"
 *   "OpenAI API" -> "openai_api"
 *   "Provider/Test" -> "provider_test"
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')             // Collapse multiple underscores
    .replace(/^_|_$/g, '');          // Trim leading/trailing underscores
}

/**
 * Get the CCSC settings file path for a specific provider
 */
function getProviderSettingsPath(providerName: string): string {
  const slug = nameToSlug(providerName);
  return path.join(CLAUDE_DIR, `ccsc-${slug}.settings.json`);
}

function blankEnv(env: Record<string, string>, key: string): boolean {
  const value = env[key];
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * An explicit fable pin wins. A legacy ANTHROPIC_REASONING_MODEL value fills
 * the fable slot only when that pin is blank. The legacy keys stay in env.
 */
function promoteLegacyReasoningModel(env: Record<string, string>): void {
  if (blankEnv(env, 'ANTHROPIC_DEFAULT_FABLE_MODEL')) {
    const legacy = env.ANTHROPIC_REASONING_MODEL;
    if (typeof legacy === 'string' && legacy.trim() !== '') {
      env.ANTHROPIC_DEFAULT_FABLE_MODEL = legacy.trim();
    }
  }

  if (blankEnv(env, 'ANTHROPIC_DEFAULT_FABLE_MODEL_NAME')) {
    const legacyName = env.ANTHROPIC_REASONING_MODEL_NAME;
    if (typeof legacyName === 'string' && legacyName.trim() !== '') {
      env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME = legacyName.trim();
    }
  }
}

/**
 * Create provider-specific settings file by copying default settings
 * and merging provider env vars.
 *
 * Merge order:
 * 1. Copy ~/.claude/settings.json as base (preserves hooks, plugins, etc.)
 * 2. Clear env and model nodes (remove user's personal settings)
 * 3. Preserve existing provider-specific model if file already exists
 * 4. Initialize current model env vars with empty values. Empty strings clear
 *    the same keys inherited from the shell: Claude Code overlays settings env
 *    onto process.env, and treats a blank model id as unset.
 *    ANTHROPIC_REASONING_MODEL is not read by current Claude Code; the fable
 *    alias is ANTHROPIC_DEFAULT_FABLE_MODEL.
 * 5. Merge common_config_claude.env from database
 * 6. Merge provider settings_config.env (highest priority)
 * 7. If fable is still empty, copy legacy ANTHROPIC_REASONING_MODEL into it
 * 8. Merge provider's other config fields (teammateMode, model, etc.)
 * 9. If apiFormat is not 'anthropic', route ANTHROPIC_BASE_URL through cc-switch proxy
 */
export async function createProviderSettings(
  providerName: string,
  providerEnv: Record<string, string>,
  providerConfig?: Record<string, unknown>,
  apiFormat?: string,
  proxyAddress?: string
): Promise<string> {
  await ensureClaudeDir();

  const settingsPath = getProviderSettingsPath(providerName);

  // Check if provider settings file exists and preserve its 'model' config
  let preservedModel: string | undefined;
  if (existsSync(settingsPath)) {
    const existingSettings = await readSettings(settingsPath);
    if (existingSettings.model) {
      preservedModel = existingSettings.model;
    }
  }

  // 1. Copy user's main settings as base (preserves hooks, plugins, statusLine, etc.)
  if (existsSync(DEFAULT_SETTINGS)) {
    await copyFile(DEFAULT_SETTINGS, settingsPath);
  }

  // Read the copied settings
  const settings = await readSettings(settingsPath);

  // 2. Clear env and model nodes (remove user's personal settings)
  settings.env = {};
  delete settings.model;

  // 3. Restore preserved model from existing provider settings
  if (preservedModel) {
    settings.model = preservedModel;
  }

  // 4. Initialize current model env vars with empty values.
  // Claude Code 2.1.282 reads the fable alias from ANTHROPIC_DEFAULT_FABLE_MODEL.
  settings.env = {
    ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
    ANTHROPIC_DEFAULT_SONNET_MODEL: '',
    ANTHROPIC_DEFAULT_OPUS_MODEL: '',
    ANTHROPIC_DEFAULT_FABLE_MODEL: '',
    ANTHROPIC_MODEL: '',
  };

  // 5. Merge common_config_claude.env from database
  const commonConfig = getCommonConfig('claude');
  if (commonConfig.env && typeof commonConfig.env === 'object') {
    settings.env = {
      ...settings.env,
      ...(commonConfig.env as Record<string, string>),
    };
  }

  // 6. Merge provider settings_config.env (highest priority)
  settings.env = {
    ...settings.env,
    ...providerEnv,
  };

  // 7. Keep an explicit fable pin. Copy legacy ANTHROPIC_REASONING_MODEL only
  //    when fable is blank. Leave the legacy key in place.
  promoteLegacyReasoningModel(settings.env);

  // 8. Merge provider's other config fields (teammateMode, model, etc.)
  if (providerConfig) {
    for (const [key, value] of Object.entries(providerConfig)) {
      if (key !== 'env') {
        (settings as Record<string, unknown>)[key] = value;
      }
    }
  }

  // 9. Route through cc-switch proxy for non-Anthropic API formats
  if (apiFormat && apiFormat !== 'anthropic' && proxyAddress) {
    settings.env.ANTHROPIC_BASE_URL = proxyAddress;
  }

  // Write back
  await writeSettings(settingsPath, settings);

  return settingsPath;
}

/**
 * Clear all CCSC-generated settings files
 * Returns the number of files removed
 */
export async function clearAllCcscSettings(): Promise<number> {
  if (!existsSync(CLAUDE_DIR)) {
    return 0;
  }

  const files = await readdir(CLAUDE_DIR);
  let removed = 0;

  for (const file of files) {
    if (CCSC_SETTINGS_PATTERN.test(file)) {
      const filePath = path.join(CLAUDE_DIR, file);
      await unlink(filePath);
      removed++;
    }
  }

  return removed;
}

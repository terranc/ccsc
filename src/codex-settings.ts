import { writeFile, mkdir, rm, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { getCommonConfigRaw } from './db.js';

const CCSC_BASE = path.join(os.homedir(), '.ccsc');
const CODEX_CONFIG_TOML = path.join(os.homedir(), '.codex', 'config.toml');
const CCSC_CODEX_DIR_PATTERN = /^codex-[a-z0-9_-]+$/;

/**
 * Convert provider name to a valid filename slug
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Get the isolated CODEX_HOME directory for a specific provider
 */
export function getCodexHomePath(providerName: string): string {
  const slug = nameToSlug(providerName);
  return path.join(CCSC_BASE, `codex-${slug}`);
}

/**
 * Parse a TOML string into a structured map.
 * Returns: Map<sectionPath, Map<key, value>>
 * Top-level keys use sectionPath = ''
 */
function parseToml(content: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>();
  sections.set('', new Map());

  let currentSection = '';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections.has(currentSection)) {
        sections.set(currentSection, new Map());
      }
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, new Map());
      }
      sections.get(currentSection)!.set(key, value);
    }
  }

  return sections;
}

/**
 * Serialize a structured map back to TOML string.
 */
function serializeToml(sections: Map<string, Map<string, string>>): string {
  const lines: string[] = [];

  const topLevel = sections.get('');
  if (topLevel && topLevel.size > 0) {
    for (const [key, value] of topLevel) {
      lines.push(`${key} = ${value}`);
    }
    lines.push('');
  }

  for (const [section, entries] of sections) {
    if (section === '') continue;
    if (entries.size === 0) continue;

    lines.push(`[${section}]`);
    for (const [key, value] of entries) {
      lines.push(`${key} = ${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Merge two TOML maps. Provider (second) overrides common (first).
 */
function mergeToml(
  common: Map<string, Map<string, string>>,
  provider: Map<string, Map<string, string>>
): Map<string, Map<string, string>> {
  const merged = new Map<string, Map<string, string>>();

  for (const [section, entries] of common) {
    merged.set(section, new Map(entries));
  }

  for (const [section, entries] of provider) {
    if (!merged.has(section)) {
      merged.set(section, new Map(entries));
    } else {
      const existing = merged.get(section)!;
      for (const [key, value] of entries) {
        existing.set(key, value);
      }
    }
  }

  return merged;
}

/**
 * Read [projects.*] trust sections from ~/.codex/config.toml
 */
async function getTrustSections(): Promise<Map<string, Map<string, string>>> {
  const sections = new Map<string, Map<string, string>>();

  if (!existsSync(CODEX_CONFIG_TOML)) return sections;

  const content = await readFile(CODEX_CONFIG_TOML, 'utf-8');
  const parsed = parseToml(content);

  for (const [section, entries] of parsed) {
    if (section.startsWith('projects.')) {
      sections.set(section, new Map(entries));
    }
  }

  return sections;
}

/**
 * Create isolated CODEX_HOME directory for a provider.
 *
 * Writes two files:
 * 1. auth.json — contains OPENAI_API_KEY from provider config
 * 2. config.toml — merged common_config_codex + provider config + trust sections
 *
 * Codex reads auth from $CODEX_HOME/auth.json, so setting CODEX_HOME
 * to this directory isolates each provider completely.
 */
export async function createProviderConfig(
  providerName: string,
  providerConfigToml: string,
  authVars: Record<string, unknown>
): Promise<string> {
  const codexHome = getCodexHomePath(providerName);

  // Create isolated directory
  if (!existsSync(codexHome)) {
    await mkdir(codexHome, { recursive: true });
  }

  // Write auth.json
  const authContent = JSON.stringify(authVars, null, 2);
  await writeFile(path.join(codexHome, 'auth.json'), authContent, { mode: 0o600 });

  // Write config.toml (merge common + provider + trust sections)
  const commonToml = getCommonConfigRaw('codex');
  const commonParsed = parseToml(commonToml);
  const providerParsed = parseToml(providerConfigToml);
  const merged = mergeToml(commonParsed, providerParsed);

  // Merge trust sections from original config.toml
  const trustSections = await getTrustSections();
  for (const [section, entries] of trustSections) {
    merged.set(section, entries);
  }

  const configContent = serializeToml(merged);
  await writeFile(path.join(codexHome, 'config.toml'), configContent, 'utf-8');

  return codexHome;
}

/**
 * Clear all CCSC-generated Codex provider directories
 */
export async function clearAllCcscCodexConfigs(): Promise<number> {
  if (!existsSync(CCSC_BASE)) {
    return 0;
  }

  const entries = await readdir(CCSC_BASE);
  let removed = 0;

  for (const entry of entries) {
    if (CCSC_CODEX_DIR_PATTERN.test(entry)) {
      await rm(path.join(CCSC_BASE, entry), { recursive: true, force: true });
      removed++;
    }
  }

  return removed;
}

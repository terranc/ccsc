import { appendFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import type { HistoryEntry, AppType } from './types.js';

const HISTORY_FILE = path.join(os.homedir(), '.ccsc-history');

/**
 * Load usage history
 * Format: timestamp\tname\tappType (appType defaults to 'claude' for old entries)
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const parts = line.split('\t');
      const timestampStr = parts[0];
      const name = parts[1];
      const appType = (parts[2] || 'claude') as AppType;
      return {
        name,
        timestamp: parseInt(timestampStr, 10),
        appType,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Save a provider selection to history
 */
export async function saveToHistory(name: string, appType: AppType = 'claude'): Promise<void> {
  const entry = `${Date.now()}\t${name}\t${appType}\n`;
  await appendFile(HISTORY_FILE, entry);
}

/**
 * Sort providers by recent usage, filtered by app type
 */
export function sortByHistory<T extends { name: string; appType: AppType }>(
  providers: T[],
  history: HistoryEntry[]
): T[] {
  const recentNames = new Map<string, number>();

  // Get the most recent timestamp for each provider (filtered by matching app type)
  for (const entry of history) {
    const matchingProvider = providers.find(
      (p) => p.name === entry.name && p.appType === entry.appType
    );
    if (matchingProvider) {
      recentNames.set(entry.name, entry.timestamp);
    }
  }

  // Sort: recent first, then alphabetical
  return [...providers].sort((a, b) => {
    const aTime = recentNames.get(a.name) || 0;
    const bTime = recentNames.get(b.name) || 0;

    if (aTime !== bTime) {
      return bTime - aTime; // More recent first
    }
    return a.name.localeCompare(b.name);
  });
}

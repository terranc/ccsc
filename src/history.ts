import { appendFile, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import type { HistoryEntry } from './types.js';

const HISTORY_FILE = path.join(os.homedir(), '.ccsc-history');

/**
 * Load usage history
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const content = await readFile(HISTORY_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const [timestampStr, name] = line.split('\t');
      return {
        name,
        timestamp: parseInt(timestampStr, 10),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Save a provider selection to history
 */
export async function saveToHistory(name: string): Promise<void> {
  const entry = `${Date.now()}\t${name}\n`;
  await appendFile(HISTORY_FILE, entry);
}

/**
 * Sort providers by recent usage
 */
export function sortByHistory<T extends { name: string }>(
  providers: T[],
  history: HistoryEntry[]
): T[] {
  const recentNames = new Map<string, number>();

  // Get the most recent timestamp for each provider (iterate in order, later entries are newer)
  for (const entry of history) {
    recentNames.set(entry.name, entry.timestamp); // Always update to keep the latest
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

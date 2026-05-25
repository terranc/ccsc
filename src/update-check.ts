import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

/**
 * Check if there's a newer version available on npm
 * @returns The latest version if newer than current, null otherwise
 */
export function checkForUpdates(): string | null {
  try {
    // Get current version
    const currentVersion = pkg.version;
    const packageName = pkg.name;

    // Query npm registry for latest version
    const result = execSync(
      `npm view ${packageName} version`,
      {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();

    const latestVersion = result;

    // Compare versions (simple string comparison works for semver)
    if (latestVersion && latestVersion !== currentVersion) {
      return latestVersion;
    }

    return null;
  } catch {
    // Silently fail - version check should not block the app
    return null;
  }
}

/**
 * Get current package version
 */
export function getCurrentVersion(): string {
  return pkg.version;
}

/**
 * Print update notification
 */
export function printUpdateNotification(latestVersion: string): void {
  const currentVersion = getCurrentVersion();
  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  📦 New version available!                      │');
  console.log(`│  Current: ${currentVersion.padEnd(38)}│`);
  console.log(`│  Latest:  ${latestVersion.padEnd(38)}│`);
  console.log('│                                                 │');
  console.log('│  Run to update:                                 │');
  console.log('│  npm update -g @terranc/ccsc                    │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
}

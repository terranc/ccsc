export interface Provider {
  id: number;
  name: string;
  displayName: string;
  envVars: Record<string, string>;
  settingsConfig: Record<string, unknown>;
}

export interface ProviderRow {
  id: number;
  name: string;
  settings_config: string;
}

export interface HistoryEntry {
  name: string;
  timestamp: number;
}

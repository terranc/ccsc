import React, { useState, useMemo, useCallback, type ReactNode } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Provider } from '../types.js';

/**
 * Mask sensitive values for display
 * Shows first 4 + **** + last 4 characters
 */
function maskSensitiveValue(value: unknown, key: string): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    return summarizeValue(value);
  }

  if (!isSensitiveKey(key)) {
    return value;
  }

  if (value.length < 8) {
    return '****';
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    normalized === 'auth' ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('credential') ||
    /api[_-]?key/.test(normalized)
  );
}

function summarizeValue(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const suffix = value.length === 1 ? '' : 's';
    return `[${value.length} item${suffix}]`;
  }

  const record = getRecord(value);
  if (record) {
    const keys = Object.keys(record);
    if (keys.length === 0) {
      return '{}';
    }

    const previewKeys = keys.slice(0, 4).join(', ');
    return keys.length > 4 ? `{ ${previewKeys}, ... }` : `{ ${previewKeys} }`;
  }

  return String(value);
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getConfigPreview(value: unknown): string {
  if (typeof value !== 'string') {
    return maskSensitiveValue(value, 'config');
  }

  const redacted = value
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*([a-zA-Z0-9_.-]+)\s*=\s*)(.+)$/);
      return match && isSensitiveKey(match[2]) ? `${match[1]}"****"` : line;
    })
    .join('\n');

  return redacted.length > 150 ? `${redacted.substring(0, 150)}...` : redacted;
}

interface ProviderPreviewProps {
  provider: Provider | undefined;
}

interface PreviewErrorBoundaryProps {
  providerName: string | undefined;
  children: ReactNode;
}

interface PreviewErrorBoundaryState {
  error: Error | undefined;
}

class PreviewErrorBoundary extends React.Component<
  PreviewErrorBoundaryProps,
  PreviewErrorBoundaryState
> {
  state: PreviewErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return { error };
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="yellow">
        <Text bold color="yellow">Preview unavailable</Text>
        {this.props.providerName && (
          <Text dimColor>{this.props.providerName} can still be selected.</Text>
        )}
        <Text dimColor>Press Enter to launch with this provider.</Text>
      </Box>
    );
  }
}

function ProviderPreview({ provider }: ProviderPreviewProps) {
  if (!provider) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No provider selected</Text>
      </Box>
    );
  }

  // Claude: envVars from settings_config.env
  // Codex: auth keys from settings_config.auth
  const envKeys = Object.keys(provider.envVars).filter((k) => provider.envVars[k]);
  const auth = getRecord(provider.settingsConfig.auth);
  const authKeys = auth
    ? Object.keys(auth).filter((k) => auth[k] !== undefined && auth[k] !== null && auth[k] !== '')
    : [];
  const configPreview = getConfigPreview(provider.settingsConfig.config);

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="gray">
      <Text bold color="cyan">
        {provider.name}
        {provider.appType === 'codex' && <Text dimColor> (codex)</Text>}
      </Text>
      <Text dimColor>{'─'.repeat(38)}</Text>

      {/* Claude env vars */}
      {envKeys.length > 0 && envKeys.map((key) => (
        <Box key={key}>
          <Text color="yellow">{key}</Text>
          <Text>: </Text>
          <Text>{maskSensitiveValue(provider.envVars[key], key)}</Text>
        </Box>
      ))}

      {/* Codex auth keys */}
      {authKeys.length > 0 && authKeys.map((key) => (
        <Box key={key}>
          <Text color="yellow">{key}</Text>
          <Text>: </Text>
          <Text>{maskSensitiveValue(auth?.[key], key)}</Text>
        </Box>
      ))}

      {/* Codex config preview */}
      {provider.appType === 'codex' && configPreview && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Config:</Text>
          <Text>{configPreview}</Text>
        </Box>
      )}

      {envKeys.length === 0 && authKeys.length === 0 && (
        <Text dimColor>No credentials configured</Text>
      )}
    </Box>
  );
}

interface AppProps {
  providers: Provider[];
  onSelect: (provider: Provider) => void;
}

export function App({ providers, onSelect }: AppProps) {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pageSize = 10;

  // Filter providers by query
  const filteredProviders = useMemo(() => {
    if (!query) return providers;
    const lowerQuery = query.toLowerCase();
    return providers.filter((p) =>
      p.name.toLowerCase().includes(lowerQuery)
    );
  }, [providers, query]);

  // Reset selection when query changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Current selected provider for preview
  const selectedProvider = filteredProviders[selectedIndex];

  // Calculate visible range for pagination
  const startIndex = Math.floor(selectedIndex / pageSize) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProviders.length);
  const visibleProviders = filteredProviders.slice(startIndex, endIndex);

  // Handle selection
  const handleSelect = useCallback(
    (provider: Provider) => {
      onSelect(provider);
      exit();
    },
    [onSelect, exit]
  );

  // Keyboard navigation
  useInput(
    useCallback(
      (input, key) => {
        if (key.upArrow) {
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredProviders.length - 1
          );
        } else if (key.downArrow) {
          setSelectedIndex((prev) =>
            prev < filteredProviders.length - 1 ? prev + 1 : 0
          );
        } else if (key.pageUp) {
          setSelectedIndex((prev) => Math.max(0, prev - pageSize));
        } else if (key.pageDown) {
          setSelectedIndex((prev) =>
            Math.min(filteredProviders.length - 1, prev + pageSize)
          );
        } else if (key.return && selectedProvider) {
          handleSelect(selectedProvider);
        } else if (key.escape) {
          exit();
          process.exit(0);
        }
      },
      [filteredProviders.length, selectedProvider, pageSize, handleSelect, exit]
    )
  );

  if (filteredProviders.length === 0) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔍 Search:{' '}
          </Text>
          <TextInput
            value={query}
            onChange={setQuery}
            placeholder="Type to search..."
            showCursor={true}
          />
        </Box>
        <Text dimColor>No providers found matching "{query}"</Text>
      </Box>
    );
  }

  const totalPages = Math.ceil(filteredProviders.length / pageSize);
  const currentPage = Math.floor(selectedIndex / pageSize) + 1;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔍 Search:{' '}
        </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Type to search..."
          showCursor={true}
        />
      </Box>

      {/* Main content: List | Preview */}
      <Box flexDirection="row">
        {/* Left: Provider list */}
        <Box flexDirection="column" width="50%">
          {visibleProviders.map((provider, index) => {
            const globalIndex = startIndex + index;
            const isSelected = globalIndex === selectedIndex;

            return (
              <Box key={provider.id}>
                <Text
                  bold={isSelected}
                  color={isSelected ? 'green' : undefined}
                  inverse={isSelected}
                >
                  {isSelected ? '❯ ' : '  '}
                  {provider.name}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Right: Preview */}
        <Box width="50%">
          <PreviewErrorBoundary
            key={selectedProvider ? `${selectedProvider.appType}:${selectedProvider.id}` : 'none'}
            providerName={selectedProvider?.name}
          >
            <ProviderPreview provider={selectedProvider} />
          </PreviewErrorBoundary>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          ↑↓ Navigate │ PgUp/PgDn Page │ Enter Select │ Esc Cancel
        </Text>
        {totalPages > 1 && (
          <Text dimColor>
            Page {currentPage}/{totalPages} ({filteredProviders.length} providers)
          </Text>
        )}
      </Box>
    </Box>
  );
}

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Provider } from '../types.js';

/**
 * Mask sensitive values for display
 * Shows first 4 + **** + last 4 characters
 */
function maskSensitiveValue(value: string | undefined, key: string): string {
  const sensitiveKeys = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY'];

  if (!value) {
    return '';
  }

  if (!sensitiveKeys.includes(key)) {
    return value;
  }

  if (value.length < 8) {
    return '****';
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

interface ProviderPreviewProps {
  provider: Provider | undefined;
}

function ProviderPreview({ provider }: ProviderPreviewProps) {
  if (!provider) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No provider selected</Text>
      </Box>
    );
  }

  const envKeys = Object.keys(provider.envVars).filter((k) => provider.envVars[k]);

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="single" borderColor="gray">
      <Text bold color="cyan">
        {provider.name}
      </Text>
      <Text dimColor>{'─'.repeat(38)}</Text>

      {envKeys.length === 0 ? (
        <Text dimColor>No environment variables configured</Text>
      ) : (
        envKeys.map((key) => (
          <Box key={key}>
            <Text color="yellow">{key}</Text>
            <Text>: </Text>
            <Text>{maskSensitiveValue(provider.envVars[key], key)}</Text>
          </Box>
        ))
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
          <ProviderPreview provider={selectedProvider} />
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

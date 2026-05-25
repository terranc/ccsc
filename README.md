# CCSC - CC Switch CLI Tool

[中文](README.zh-CN.md)

A convenient multi-provider Claude Code launcher. Select your Claude service provider from [CC Switch](https://github.com/farion1231/cc-switch) and switch on the fly.

## Why this project?

As a CC Switch user, I manage multiple Claude service providers (Anthropic, domestic models, etc.) and frequently need to use different providers across different projects. However, CC Switch works by modifying `~/.claude/settings.json`, which introduces two problems:

1. **Affects running Claude sessions** - Switching providers in CC Switch changes all running Claude instances, potentially causing unexpected behavior
2. **Global scope only** - All Claude sessions share the same environment variables, making it difficult to use different providers simultaneously

CCSC solves these problems by:

- **Environment isolation** - Only affects Claude processes launched by CCSC, not global settings or other running instances
- **No config pollution** - Never modifies `~/.claude/settings.json`
- **Session-level provider selection** - Each terminal session can use a different provider
- **Quick switching** - Fast interactive selection without opening a GUI

<img width="2563" height="1471" alt="My_Photor_1775418199154" src="https://github.com/user-attachments/assets/22890115-e2a4-46e3-92ef-6bc8270159c8" />

Use cases:
- Working on multiple projects that require different providers
- Testing the same codebase against different Claude models
- Running parallel Claude sessions with different providers

## Features

- 🖥️ **Cross-platform** - Supports macOS, Linux, Windows
- 📦 **Easy to install** - Install via npm/bun, no external dependencies
- 🔍 **Interactive UI** - Beautiful terminal UI with search and preview panel
- 👀 **Preview panel** - View environment variable configuration before selecting
- 📜 **History** - Recently used providers appear at the top
- ⌨️ **Keyboard navigation** - Full keyboard support including Page Up/Down
- 🔄 **Passthrough arguments** - All arguments are passed directly to Claude CLI

## Prerequisites

- Node.js >= 18.0.0
- [CC Switch](https://github.com/farion1231/cc-switch) installed and configured
- [Claude CLI](https://claude.ai/code) installed

## Installation

```bash
# npm
npm install -g @terranc/ccsc

# or bun
bun install -g @terranc/ccsc

# or run directly
npx @terranc/ccsc
```

## Usage

### Interactive selection

Run `ccsc` for interactive provider selection (after global install):

```bash
ccsc
```

The interface includes:
- **Left panel**: Provider list with search support
- **Right panel**: Environment variable preview for the selected provider

### Keyboard shortcuts

| Key | Function |
|-----|----------|
| `↑` / `↓` | Navigate provider list |
| `PgUp` / `PgDn` | Page navigation (10 per page) |
| `Enter` | Confirm selection |
| `Esc` | Cancel |
| `Type text` | Search/filter providers |

### Passing arguments to Claude

All arguments except `-h`/`--help` and `-V`/`--version` are passed directly to Claude:

```bash
ccsc --continue
ccsc --dangerously-skip-permissions
ccsc --print "Hello"
ccsc --model claude-sonnet-4-20250514

# or via npx
npx @terranc/ccsc --continue
```

### Help

```bash
ccsc --help
ccsc --version
```

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CC_CLI_PATH` | Claude CLI executable path | `claude` |
| `CC_SWITCH_DB_PATH` | Full path to CC Switch database | `~/.cc-switch/cc-switch.db` |
| `CC_SWITCH_HOME` | CC Switch config directory | `~/.cc-switch` |

### Custom Claude CLI

You can specify the CLI to use via environment variable or command-line argument:

```bash
# Method 1: Environment variable
export CC_CLI_PATH=/path/to/happy
ccsc

# Method 2: Command-line argument (higher priority)
ccsc --cli happy
ccsc --cli /path/to/custom-cli
```

The `--cli` argument takes priority over the `CC_CLI_PATH` environment variable.

### Database path configuration

```bash
# macOS / Linux
export CC_SWITCH_DB_PATH=/custom/path/cc-switch.db

# Windows (PowerShell)
$env:CC_SWITCH_DB_PATH = "C:\custom\path\cc-switch.db"

# Windows (CMD)
set CC_SWITCH_DB_PATH=C:\custom\path\cc-switch.db
```

## History

Provider usage history is stored in `~/.ccsc-history`. Recently used providers are displayed at the top of the list.

## Development

```bash
# Clone the repository
git clone https://github.com/terranc/ccsc.git
cd ccsc

# Install dependencies
npm install

# Build
npm run build

# Local test
node dist/index.js

# Global link test
npm link
```

## Tech stack

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input) - Text input component
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite bindings
- [commander](https://github.com/tj/commander.js) - CLI framework

## Links
- [Linux Do](https://linux.do/)

## License

MIT

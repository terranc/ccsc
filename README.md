# CCSC - CC Switch CLI Tool

[中文](README.zh-CN.md)

A convenient multi-provider launcher for Claude Code and Codex CLI. Select your service provider from [CC Switch](https://github.com/farion1231/cc-switch) and switch on the fly.

## Why this project?

As a CC Switch user, I manage multiple service providers (Anthropic, domestic models, etc.) for both Claude Code and Codex CLI, and frequently need to use different providers across different projects. However, CC Switch works by modifying global config files, which introduces two problems:

1. **Affects running sessions** - Switching providers changes all running instances, potentially causing unexpected behavior
2. **Global scope only** - All sessions share the same configuration, making it difficult to use different providers simultaneously

CCSC solves these problems by:

- **Environment isolation** - Only affects processes launched by CCSC, not global settings or other running instances
- **No config pollution** - Never modifies `~/.claude/settings.json` or `~/.codex/config.toml`
- **Session-level provider selection** - Each terminal session can use a different provider
- **Multi-CLI support** - Works with both Claude Code and Codex CLI
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
- 🔄 **Passthrough arguments** - All arguments are passed directly to the target CLI
- 🤖 **Multi-CLI** - Supports both Claude Code and Codex CLI

## Prerequisites

- Node.js >= 18.0.0
- [CC Switch](https://github.com/farion1231/cc-switch) installed and configured
- [Claude CLI](https://claude.ai/code) and/or [Codex CLI](https://github.com/openai/codex) installed

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

### Launch Claude Code

```bash
ccsc              # interactive provider selection → launch Claude
ccsc claude       # same as above
```

### Launch Codex CLI

```bash
ccsc codex        # interactive provider selection → launch Codex
```

### Keyboard shortcuts

| Key | Function |
|-----|----------|
| `↑` / `↓` | Navigate provider list |
| `PgUp` / `PgDn` | Page navigation (10 per page) |
| `Enter` | Confirm selection |
| `Esc` | Cancel |
| `Type text` | Search/filter providers |

### Passing arguments

All arguments are passed directly to the target CLI:

```bash
# Claude Code
ccsc --continue
ccsc --print "Hello"
ccsc --model claude-sonnet-4-20250514

# Codex CLI
ccsc codex -- some prompt here
```

### Clear generated config files

```bash
ccsc --clear
```

### Help

```bash
ccsc --help
ccsc codex --help
```

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CC_SWITCH_DB_PATH` | Full path to CC Switch database | `~/.cc-switch/cc-switch.db` |
| `CC_SWITCH_HOME` | CC Switch config directory | `~/.cc-switch` |

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
- [node-sqlite3-wasm](https://github.com/nicolo-ribaudo/node-sqlite3-wasm) - SQLite bindings (WASM)
- [commander](https://github.com/tj/commander.js) - CLI framework

## Links
- [Linux Do](https://linux.do/)

## License

MIT

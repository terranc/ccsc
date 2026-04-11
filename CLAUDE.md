# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

CCSC (CC Switch CLI) - A cross-platform CLI tool for selecting Claude Code providers from CC Switch database. Creates isolated provider-specific settings without modifying global `~/.claude/settings.json`.

## Commands

```bash
# Build
npm run build          # Compile TypeScript to dist/

# Development
npm run dev            # Watch mode for TypeScript

# Local testing
node dist/index.js     # Run directly

# Global link for testing
npm link               # Create global ccsc command
npm unlink -g @terranc/ccsc  # Remove global link
```

## Architecture

```
src/
├── index.ts       # Entry point, Commander CLI setup, main orchestration
├── db.ts          # SQLite queries to CC Switch database
├── history.ts     # Usage history persistence (~/.ccsc-history)
├── settings.ts    # Provider-specific settings file management
├── types.ts       # TypeScript interfaces (Provider, HistoryEntry)
└── ui/
    └── App.tsx    # Ink React component for interactive selection
```

### Data Flow

1. `db.ts` reads providers from `~/.cc-switch/cc-switch.db` (SQLite)
2. `history.ts` sorts providers by recent usage
3. `ui/App.tsx` renders interactive selection UI (Ink + React)
4. `settings.ts` creates isolated `~/.claude/ccsc-{slug}.settings.json` with merged env vars
5. `index.ts` spawns Claude CLI with `--settings` flag pointing to the generated file

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CC_CLI_PATH` | Custom Claude CLI binary | `claude` |
| `CC_SWITCH_DB_PATH` | Full path to database file | `~/.cc-switch/cc-switch.db` |
| `CC_SWITCH_HOME` | Custom config directory | `~/.cc-switch` |

### CLI Option

Use `--cli` option to specify CLI tool (overrides `CC_CLI_PATH` env):

```bash
ccsc --cli happy
ccsc --cli /path/to/custom-cli
```

## Key Implementation Details

- **Settings Isolation**: Each provider gets its own settings file (`ccsc-{slug}.settings.json`), never modifies `~/.claude/settings.json`
- **Env Merging**: `settings.ts` merges global `common_config_claude` env vars with provider-specific env vars
- **History**: Simple append-only file with timestamps, parsed and sorted in-memory
- **UI**: Ink React components with keyboard navigation (↑/↓, PgUp/PgDn, Enter, Esc, search)

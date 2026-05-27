# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

CCSC (CC Switch CLI) - A cross-platform CLI tool for selecting Claude Code and Codex CLI providers from CC Switch database. Creates isolated provider-specific settings without modifying global `~/.claude/settings.json` or `~/.codex/config.toml`.

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
├── index.ts           # Entry point, Commander CLI setup, main orchestration
├── db.ts              # SQLite queries to CC Switch database
├── history.ts         # Usage history persistence (~/.ccsc-history)
├── settings.ts        # Claude: provider-specific JSON settings file management
├── codex-settings.ts  # Codex: provider-specific TOML config file management
├── types.ts           # TypeScript interfaces (Provider, HistoryEntry, AppType)
└── ui/
    └── App.tsx        # Ink React component for interactive selection
```

### Data Flow (Claude Code)

1. `db.ts` reads providers from `~/.cc-switch/cc-switch.db` (SQLite, app_type='claude')
2. `history.ts` sorts providers by recent usage
3. `ui/App.tsx` renders interactive selection UI (Ink + React)
4. `settings.ts` creates isolated `~/.claude/ccsc-{slug}.settings.json` with merged env vars
5. `index.ts` spawns Claude CLI with `--settings` flag pointing to the generated file

### Data Flow (Codex CLI)

1. `db.ts` reads providers from `~/.cc-switch/cc-switch.db` (SQLite, app_type='codex')
2. `history.ts` sorts providers by recent usage
3. `ui/App.tsx` renders interactive selection UI (Ink + React)
4. `codex-settings.ts` creates isolated `~/.codex/ccsc-{slug}.config.toml` with merged TOML config
5. `index.ts` spawns Codex CLI with `--profile ccsc-{slug}` and auth env vars

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CC_SWITCH_DB_PATH` | Full path to database file | `~/.cc-switch/cc-switch.db` |
| `CC_SWITCH_HOME` | Custom config directory | `~/.cc-switch` |

### CLI Usage

```bash
# Launch Claude Code (default)
ccsc
ccsc claude

# Launch Codex CLI
ccsc codex

# Clear all generated config files
ccsc --clear
```

## Key Implementation Details

- **Settings Isolation**: Each provider gets its own config file, never modifies global config
  - Claude: `~/.claude/ccsc-{slug}.settings.json`
  - Codex: `~/.codex/ccsc-{slug}.config.toml`
- **Env Merging**: `settings.ts` merges global `common_config_claude` env vars with provider-specific env vars
- **TOML Merge**: `codex-settings.ts` merges `common_config_codex` TOML with provider config TOML (provider overrides)
- **Auth Handling**: Claude passes env vars in settings JSON; Codex passes auth env vars (`OPENAI_API_KEY` etc.) via spawn env
- **History**: Append-only file (`~/.ccsc-history`) with format `timestamp\tname\tappType`, sorted in-memory per app type
- **UI**: Ink React components with keyboard navigation (↑/↓, PgUp/PgDn, Enter, Esc, search)

## Version Release Preference
<!-- github-push-and-release: simple -->
This project uses simple mode: CHANGELOG + commit + push, no git tag, no GitHub release.
Auto-detected: npm CLI package
To force a full release, use `/github-push-and-release release`.

<!-- github-push-and-release-commit-lang: en -->

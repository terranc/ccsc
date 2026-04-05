# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Claude environment configuration repository. Dynamically reads provider configurations from CC Switch SQLite database and provides an interactive provider selection interface.

## Usage

```bash
# Activate the ccs command
source ~/.claude-envs/activate.sh

# Interactive selection (uses fzf)
ccs
# Shows provider list with preview, last used provider at top
# Select with arrow keys, press Enter to start

# Direct selection by name
ccs jdcloud
# Starts Claude with the specified provider

# Pass additional arguments to Claude
ccs jdcloud --continue
```

## Commands

- `ccs` — Interactive provider selection with fzf
- `ccs <provider_name>` — Direct start with specified provider
- `ccs <provider_name> [claude-args...]` — Pass additional arguments to Claude

## Architecture

```
~/.claude-envs/
├── ccs               # Main entry script
├── activate.sh       # Creates ccs alias
└── .last_providers   # Usage history (auto-generated)

~/.cc-switch/
└── cc-switch.db      # CC Switch database (read-only)
```

## Data Source

Provider configurations are read from `cc-switch.db` (CC Switch SQLite database):

- **Table**: `providers`
- **Filter**: `app_type='claude'`
- **Config**: `settings_config.env` JSON field contains environment variables

## Dependencies

- `sqlite3` — Database queries
- `fzf` — Interactive selection
- `jq` — JSON parsing

## Trellis Workflow System

`.trellis/` contains an AI development workflow:

- `workflow.md` — Session start/end process, development flow
- `spec/` — Frontend/backend guidelines
- `workspace/` — Per-developer workspaces
- `tasks/` — Task tracking

**Session Start**: Run `/trellis:start` to initialize developer identity and context.

## Hooks

`.claude/hooks/` contains Python scripts:
- `session-start.py` — Session initialization
- `inject-subagent-context.py` — Subagent context injection
- `ralph-loop.py` — Subagent loop detection

## Agents

`.claude/agents/` defines subagent types:
- `plan.md`, `implement.md`, `research.md`, `dispatch.md`, `debug.md`, `check.md`

## Version Release Preference
<!-- github-push-and-release: simple -->
This project uses simple mode: CHANGELOG + commit + push, no git tag, no GitHub release.
To force a full release, use `/github-push-and-release release`.

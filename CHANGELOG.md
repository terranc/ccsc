# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepchangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-04-13

### Fixed
- Replace `better-sqlite3` (native C++ addon) with `node-sqlite3-wasm` (pure WASM) to fix Node.js version compatibility issues

## [1.0.3] - 2026-04-11

### Added
- `--cli <name>` option to specify CLI tool (overrides `CC_CLI_PATH` env var)

### Changed
- Renamed environment variable from `CLAUDE_CODE_PATH` to `CC_CLI_PATH`
- Priority for CLI selection: `--cli` option > `CC_CLI_PATH` env > `claude` default

## [1.0.2] - 2026-04-06

### Added
- Support provider-level settings configuration from CC Switch database
- `getCommonConfig()` function to read common config for any app type

### Changed
- Enhanced settings merge order with clear documentation
- Provider settings now include full `settingsConfig` for advanced configuration

## [1.0.1] - 2026-04-06

### Fixed
- Corrected GitHub repository URL in package.json

## [1.0.0] - 2026-04-06

### Added
- Published to npm as `@terranc/ccsc`
- Interactive provider selection with Ink-based terminal UI
- Keyboard navigation with Page Up/Down support
- Search/filter providers by name

### Changed
- Package renamed from `ccsc` to `@terranc/ccsc` (scoped package)
- Updated README with new installation instructions

## [0.1.0] - 2026-04-06

### Added
- Cross-platform Node.js CLI for CC Switch provider selection
- Interactive provider selection with fzf and preview window
- Fallback to @inquirer/search when fzf is unavailable
- Provider-specific settings file management (~/.claude/ccsc-<slug>.settings.json)
- Common config environment variable merging from CC Switch database
- `--clear` flag to remove all CCSC-generated settings files
- Usage history tracking with most recent provider shown first
- Preview panel displaying provider environment variables

### Changed
- Migrated from shell script to TypeScript/Node.js for cross-platform support
- Simplified Claude launch by using settings file instead of environment injection

### Fixed
- Properly display ANTHROPIC_AUTH_TOKEN in preview panel

# CCSC - CC Switch 跨平台 CLI 工具

[English](README.md)

方便的多 CLI 启动器，支持 Claude Code 和 Codex CLI。从 [CC Switch](https://github.com/farion1231/cc-switch) 中选择服务提供商，随时切换。

## 为什么需要这个项目？

作为 CC Switch 的用户，我管理着多个 Claude Code 和 Codex CLI 的服务提供商（Anthropic、国产模型等），经常需要在不同的项目中切换不同的服务商。但 CC Switch 的工作方式是修改全局配置文件，这带来了两个问题：

1. **影响已运行的会话** - 切换服务商时所有正在运行的实例也会跟着切换，可能导致意外行为
2. **仅支持全局作用域** - 所有会话共享相同的配置，难以同时使用不同的服务商

CCSC 通过以下方式解决这些问题：

- **环境隔离** - 只影响由 CCSC 启动的进程，不影响全局设置或其他运行中的实例
- **不污染配置** - 完全不修改 `~/.claude/settings.json` 或 `~/.codex/config.toml`
- **会话级服务商选择** - 每个终端会话可以使用不同的服务商
- **多 CLI 支持** - 同时支持 Claude Code 和 Codex CLI
- **快速切换** - 无需打开 GUI，快速交互式选择

<img width="2563" height="1471" alt="My_Photor_1775418199154" src="https://github.com/user-attachments/assets/22890115-e2a4-46e3-92ef-6bc8270159c8" />

适用场景：
- 同时开发多个使用不同服务商的项目
- 在不同 Claude 模型间测试同一代码库
- 并行运行使用不同服务商的 Claude 会话

## 功能特性

- 🖥️ **跨平台** - 支持 macOS、Linux、Windows
- 📦 **易于安装** - 通过 npm/bun 安装，无外部依赖
- 🔍 **交互式 UI** - 美观的终端界面，支持搜索和预览面板
- 👀 **预览面板** - 选择前查看环境变量配置
- 📜 **历史记录** - 最近使用的服务商排在前面
- ⌨️ **键盘导航** - 完整的键盘支持，包括 Page Up/Down
- 🔄 **参数透传** - 所有参数直接传递给目标 CLI
- 🤖 **多 CLI 支持** - 同时支持 Claude Code 和 Codex CLI

## 前置要求

- Node.js >= 18.0.0
- [CC Switch](https://github.com/farion1231/cc-switch) 已安装并配置
- [Claude CLI](https://claude.ai/code) 和/或 [Codex CLI](https://github.com/openai/codex) 已安装

## 安装

```bash
# npm
npm install -g @terranc/ccsc

# 或 bun
bun install -g @terranc/ccsc

# 或直接运行
npx @terranc/ccsc
```

## 使用方法

### 启动 Claude Code

```bash
ccsc              # 交互式选择服务商 → 启动 Claude
ccsc claude       # 同上
```

### 启动 Codex CLI

```bash
ccsc codex        # 交互式选择服务商 → 启动 Codex
```

### 键盘快捷键

| 按键 | 功能 |
|-----|------|
| `↑` / `↓` | 导航服务商列表 |
| `PgUp` / `PgDn` | 翻页（每页 10 条） |
| `Enter` | 确认选择 |
| `Esc` | 取消 |
| `输入文字` | 搜索/过滤服务商 |

### 传递参数

所有参数直接传递给目标 CLI：

```bash
# Claude Code
ccsc --continue
ccsc --print "Hello"
ccsc --model claude-sonnet-4-20250514

# Codex CLI
ccsc codex -- some prompt here
```

### 清除生成的配置文件

```bash
ccsc --clear
```

### 帮助

```bash
ccsc --help
ccsc codex --help
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CC_SWITCH_DB_PATH` | CC Switch 数据库完整路径 | `~/.cc-switch/cc-switch.db` |
| `CC_SWITCH_HOME` | CC Switch 配置目录 | `~/.cc-switch` |

### 数据库路径配置

```bash
# macOS / Linux
export CC_SWITCH_DB_PATH=/custom/path/cc-switch.db

# Windows (PowerShell)
$env:CC_SWITCH_DB_PATH = "C:\custom\path\cc-switch.db"

# Windows (CMD)
set CC_SWITCH_DB_PATH=C:\custom\path\cc-switch.db
```

## 历史记录

服务商使用历史存储在 `~/.ccsc-history`，最近使用的服务商会显示在列表顶部。

## 开发

```bash
# 克隆仓库
git clone https://github.com/terranc/ccsc.git
cd ccsc

# 安装依赖
npm install

# 构建
npm run build

# 本地测试
node dist/index.js

# 全局链接测试
npm link
```

## 技术栈

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input) - 文本输入组件
- [node-sqlite3-wasm](https://github.com/nicolo-ribaudo/node-sqlite3-wasm) - SQLite 绑定 (WASM)
- [commander](https://github.com/tj/commander.js) - CLI 框架

## 链接
- [Linux Do](https://linux.do/)

## 许可证

MIT

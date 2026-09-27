# ai-agent-saving-tech

**English** | [日本語](README.ja.md)

Agent Skills that make AI coding agents use fewer tokens and stretch their usage limits (5-hour, weekly and monthly caps, credits, API spend) without lowering the quality of the work.

There is one skill per agent, plus an agent-neutral one:

| Skill | For | Covers |
| --- | --- | --- |
| `token-saver-claude-code` | Claude Code | `/clear` vs `/compact`, prompt cache behavior, CLAUDE.md and path-scoped rules, `opusplan`, `/effort`, subagent model, hooks that trim test output, background usage |
| `token-saver-codex` | OpenAI Codex | `model_reasoning_effort`, `model_verbosity`, `tool_output_token_limit`, auto-compaction, the 32 KiB AGENTS.md cap, fast mode, MCP servers, profiles |
| `token-saver-copilot` | GitHub Copilot | Usage-based billing (AI Credits), model choice, free completions, `applyTo`-scoped instructions, tool picker, code review and cloud agent cost, budgets |
| `token-saver-cursor` | Cursor | Usage pools, Auto and Composer, Max Mode, rule types (`alwaysApply`, `globs`), `.cursorignore`, spending limits |
| `token-saver-opencode` | OpenCode | Go's 5-hour, weekly and monthly limits, Zen balance, `small_model`, `compaction.prune`, per-agent models |
| `token-saver` | Any agent | The same core rules and a map of where each lever lives in other agents (Gemini CLI, Windsurf, Cline, Roo Code and more) |

## What the skills do

Each skill has two jobs.

1. **Work lean.** While the skill is active, the agent follows a short set of core rules: locate before reading, read only the needed range, keep command output small, batch tool calls, answer concisely, do small or sequential work itself instead of spawning subagents (and delegate only large read-only or parallel work, to a cheap model), and suggest a fresh session or compaction at natural breaks. The rules also say where not to save: hard problems and verification get the reading and reasoning they need, because rework is the most expensive thing an agent can do.
2. **Tune the setup.** When you ask for an audit, the agent runs a read-only script that measures what is loaded into every request (instruction files, unscoped rules, MCP servers, skill descriptions) and checks the settings that drive token use, then proposes concrete changes and applies them only after you agree.

Skills load only when triggered, so each skill also offers to add a seven-line "token discipline" section to your always-loaded instruction file (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` or a Cursor rule). That keeps the lean-work rules in effect in every session for about 200 tokens.

## Install

Install with the [skills CLI](https://github.com/vercel-labs/skills). Pick the skill for your agent and pass the matching `--agent`:

```bash
# Claude Code
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-claude-code -a claude-code

# Codex
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-codex -a codex

# GitHub Copilot
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-copilot -a github-copilot

# Cursor
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-cursor -a cursor

# OpenCode
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-opencode -a opencode

# Any other agent
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver -a <agent>
```

- Add `-g` to install for your user (all projects) instead of the current project.
- Run `npx skills add otnc/skills_ai-agent-saving-tech --list` to see the skills, or run it without `--skill` to choose interactively.
- If you use several agents, install each one's dedicated skill for that agent. Installing `token-saver` next to a dedicated skill for the same agent only duplicates the core rules.

Without the CLI, copy a folder from `skills/` into your agent's skills directory (for example `~/.claude/skills/` or `.agents/skills/`).

## Usage

Ask in your own words, for example:

- "I keep hitting the 5-hour limit. Audit my setup."
- "Why is my usage so high today?"
- "トークンを節約する設定にして"

To run the audit yourself (Node.js 18+, no dependencies, read-only):

```bash
node .claude/skills/token-saver-claude-code/scripts/audit.mjs --agent claude-code
node <skill-dir>/scripts/audit.mjs --agent all --json
```

Example output:

```
== codex ==
Always-loaded instructions: ~3.1k tokens (AGENTS.md 262L)
WARN AGENTS.md: 262 lines (~3.1k tokens), loaded on every request. Aim for under 200: move task-specific parts into skills or path-scoped rules.
WARN model_reasoning_effort = "high" for every task. Use "low" or "medium" as the default and raise it per task (/model), or set plan_mode_reasoning_effort for planning only.
NOTE tool_output_token_limit is unset. A limit such as 12000 keeps one huge command output from filling the context.
```

## Design

- **The skills are small themselves.** Each `SKILL.md` is about 80 lines (roughly 1,500 tokens). Detailed commands, settings and pricing live in `references/` and are read only when needed.
- **Facts are dated and sourced.** Limits and prices change often, so every `references/facts.md` carries a snapshot date and links to the official pages, and the agent is told to verify before quoting a number.
- **Written in English** so the always-loaded parts stay cheap (English usually takes fewer tokens than the same content in Japanese). The descriptions include Japanese trigger phrases, and the agent still answers in your language.

## Layout

```
skills/
├── token-saver/                 # agent-neutral
├── token-saver-claude-code/
│   ├── SKILL.md                 # core rules + agent specifics + audit workflow
│   ├── references/
│   │   ├── levers.md            # every command and setting that affects usage
│   │   ├── facts.md             # limits and pricing snapshot with sources
│   │   └── budget.md            # pacing against 5-hour / weekly / monthly windows
│   ├── assets/always-on.md      # snippet for the always-loaded instruction file
│   └── scripts/audit.mjs        # read-only setup audit
├── token-saver-codex/
├── token-saver-copilot/
├── token-saver-cursor/
└── token-saver-opencode/
shared/                          # single source for the files copied into every skill
scripts/sync.mjs                 # copies shared/ into skills/ (--check in CI)
scripts/validate.mjs             # checks SKILL.md against the Agent Skills spec
tests/audit.test.mjs
base/README.base.md              # source of README.md and README.ja.md (built by kiritan)
.agents/skills/kiritan/          # kiritan's own skill, for agents editing the README
```

## Development

The skills and scripts need only Node.js 18+. Building the README needs Node.js 22.7+ for [kiritan](https://github.com/otnc/kiritan), installed as a dev dependency with `npm install`.

Edit the shared parts (core rules, always-on snippet, budget guide, audit script) in `shared/`, then copy them into every skill:

```bash
npm run sync                     # copy shared/ into skills/
npm run validate                 # Agent Skills spec + sync check (CI)
npm test
```

`README.md` and `README.ja.md` are generated. Edit `base/README.base.md`, which holds both languages in `:::kiritan{locale=...}` blocks, then rebuild:

```bash
npm run docs:build               # regenerate README.md and README.ja.md
npm run docs:verify              # confirm they match the base file (CI)
```

The repository also carries [kiritan's own skill](https://github.com/otnc/kiritan/tree/main/skills/kiritan) in `.agents/skills/kiritan/`, which agents that read `.agents/skills/` (Codex, Cursor, GitHub Copilot, OpenCode and others) pick up directly. Claude Code reads `.claude/skills/`, which is not committed; run `npx skills add otnc/kiritan --skill kiritan -a claude-code` once to link it there.

## Sources

The rules and settings are based on official documentation and on articles from Qiita, Zenn and note, including:

- [Claude Code: Manage costs effectively](https://code.claude.com/docs/en/costs), [Prompt caching](https://code.claude.com/docs/en/prompt-caching)
- [Codex pricing](https://developers.openai.com/codex/pricing), [Codex best practices](https://developers.openai.com/codex/learn/best-practices)
- [GitHub Copilot is moving to usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)
- [Cursor usage and limits](https://cursor.com/help/models-and-usage/usage-limits), [Cursor rules](https://cursor.com/docs/context/rules)
- [OpenCode Go](https://opencode.ai/docs/go/), [OpenCode Zen](https://opencode.ai/docs/zen/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Qiita: @ktdatascience's guide to reducing Claude usage](https://qiita.com/ktdatascience/items/8f867d957ba29133bc32)
- [Claude Codeのトークンコストを、仕組みから理解して削る (Zenn)](https://zenn.dev/acntechjp/articles/f00b201cabcc39)
- [Claude Codeのトークン消費を減らす方法 (Zenn)](https://zenn.dev/yurukusa/articles/gvq329nn88wsna)
- [Claude Code・Codexのトークン消費を抑える技術30選 (note)](https://note.com/kawaidesign/n/n067cab520432)
- [Codex・Claude Codeの利用制限、残量%で節約していませんか (SuzuLabo)](https://suzulabo.co.jp/ai/834/)

## License

[MIT](LICENSE)

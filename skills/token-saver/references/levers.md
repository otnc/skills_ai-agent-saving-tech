# Levers by agent

Snapshot 2026-09. Commands and keys change between versions; confirm with the agent's `/help` or docs before telling the user to run one. For full detail, install the dedicated `token-saver-<agent>` skill.

| Lever | Claude Code | Codex | GitHub Copilot | Cursor | OpenCode |
| --- | --- | --- | --- | --- | --- |
| New session | `/clear` | `/new` | New chat; `/clear` in CLI | New chat | `/new` |
| Compaction | `/compact [focus]`, `autoCompactWindow` | `/compact`, `model_auto_compact_token_limit` | `/compact` in CLI | `/summarize` | `/compact`, `compaction.prune` |
| Undo a wrong path | `/rewind` | `/fork` from an earlier point | Undo in chat | Restore checkpoint | `/undo` |
| Model | `/model`, `opusplan` | `/model`, `model` | Model picker, Auto | Auto, Composer, model picker | `/models`, `model` |
| Effort or thinking | `/effort`, `effortLevel` | `model_reasoning_effort`, `plan_mode_reasoning_effort` | Model choice | Thinking model variants | Model choice |
| Always-loaded instructions | `CLAUDE.md` (under 200 lines), `.claude/rules/` with `paths:` | `AGENTS.md` (32 KiB cap) | `.github/copilot-instructions.md`, `*.instructions.md` with `applyTo` | `.cursor/rules/*.mdc` (`alwaysApply`, `globs`), `AGENTS.md` | `AGENTS.md`, `instructions` |
| MCP servers | `/mcp` | `[mcp_servers.x] enabled = false` | Tool picker, `.vscode/mcp.json` | Settings > MCP | `mcp.x.enabled = false` |
| Cheap subagents | `CLAUDE_CODE_SUBAGENT_MODEL`, `model:` in agent files | Subagents | Cloud agent (heavy) | Background agents (heavy) | `agent.<name>.model`, `small_model` |
| Output length | Ask; output style | `model_verbosity = "low"` | Ask | Ask | Ask |
| Check usage | `/usage`, `/context` | `/status` | Billing usage page | Spending tab | Console |

## Agents not in the table

Look for the same levers under these usual names:

- **Instruction file:** `AGENTS.md` is read by most agents (Gemini CLI also uses `GEMINI.md`; Windsurf uses rules files; Cline and Roo Code use rules directories). Keep whichever is always loaded short.
- **Compaction:** "compress", "summarize", "condense context".
- **Ignore file:** `.geminiignore`, `.codeiumignore`, `.clineignore` and similar, or `.gitignore`.
- **Model and effort:** a model picker or config key, often with a "thinking budget" or "reasoning effort".

## Sources

- Agent Skills specification: https://agentskills.io/specification
- Claude Code, manage costs: https://code.claude.com/docs/en/costs
- Codex pricing and tips: https://developers.openai.com/codex/pricing
- GitHub Copilot usage-based billing: https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/
- Cursor usage and limits: https://cursor.com/help/models-and-usage/usage-limits
- OpenCode Go: https://opencode.ai/docs/go/
- How and when to use subagents (Anthropic): https://claude.com/blog/subagents-in-claude-code
- Multi-agents: what's actually working (Cognition): https://cognition.com/blog/multi-agents-working
- Codex subagents: https://developers.openai.com/codex/subagents
- Why long chats use more of the limit (Qiita, ja): https://qiita.com/ktdatascience/items/8f867d957ba29133bc32

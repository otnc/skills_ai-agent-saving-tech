# OpenCode levers

Config lives in `opencode.json` (project root) and `~/.config/opencode/opencode.json` (user). Both accept JSONC.

## 1. A lean config

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // Main model: a mid-priced one for everyday work.
  "model": "<provider>/<everyday-model>",
  // Titles and other light background tasks.
  "small_model": "<provider>/<cheap-fast-model>",
  "compaction": {
    "auto": true,   // compact when the context is full (default)
    "prune": true   // drop old tool outputs from history (default false)
  },
  "agent": {
    // Cheap model for read-only exploration; the main thread keeps only conclusions.
    "explore": { "model": "<provider>/<cheap-fast-model>" },
    // Think harder only while planning.
    "plan": { "model": "<provider>/<strong-model>" }
  },
  "mcp": {
    "docs": { "type": "local", "command": ["npx", "-y", "some-docs-mcp"], "enabled": false }
  },
  "watcher": { "ignore": ["dist/**", "coverage/**", "*.log"] }
}
```

Pick concrete model IDs with `/models`; on Go, compare the per-model monthly allowance and estimated requests on the Go docs page (see [facts.md](facts.md)).

## 2. Instructions

- `AGENTS.md` in the project root (and `~/.config/opencode/AGENTS.md` globally) is loaded into every session. Keep it to build and test commands, layout and hard conventions. OpenCode falls back to `CLAUDE.md` when there is no `AGENTS.md`.
- The `instructions` array adds more files, and globs in it load every match. List only what every session needs.
- Put repeatable procedures in skills, which load only when used.

## 3. Agents and tools

- Built-in `build` and `plan` agents plus subagents such as `general` and `explore`. Each subagent session starts its own context and costs its own requests, so use them only for large read-only exploration or parallel independent work, and give them a cheap model with `agent.<name>.model`.
- Disable tools an agent does not need (`tools` per agent) so their definitions are not sent.
- Disable MCP servers you are not using with `"enabled": false`.

## 4. Session commands

| Command | Use |
| --- | --- |
| `/new` | Fresh session for unrelated work |
| `/compact` | Summarize a long session at a natural break |
| `/models` | Switch model |
| `/undo`, `/redo` | Roll back a wrong turn instead of correcting it over several turns |
| `/sessions` | Return to an earlier session |

## 5. Go and Zen

- **Go** ($10/month): each model has a monthly dollar allowance; the 5-hour window allows 20% of it and the week 50%. Put routine work on the cheap, high-allowance models.
- **Use balance:** with Zen credits, enabling "Use balance" in the console lets Go fall back to the Zen balance after a limit instead of blocking requests.
- **Zen** (pay-as-you-go): some models are free for a limited time, and some have cached-read prices, which reward keeping a stable prefix (do not switch models mid-task). Set a monthly limit and check the auto-reload amount so a runaway session cannot drain the card.

## 6. Prompting habits to suggest to the user

- Name the file, the function and the done condition; add a test or expected output.
- Put all corrections in one message.
- Edit trivial things by hand.

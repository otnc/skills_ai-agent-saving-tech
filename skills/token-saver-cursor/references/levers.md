# Cursor levers

## 1. Rules: scope them

Project rules live in `.cursor/rules/*.mdc`. The front matter decides when a rule is included:

| Type | Front matter | Included |
| --- | --- | --- |
| Always Apply | `alwaysApply: true` | In every request |
| Apply Intelligently | `alwaysApply: false`, `description` only | When the agent judges the description relevant |
| Apply to Specific Files | `alwaysApply: false`, `globs` | When a matching file is in context |
| Apply Manually | neither | Only when you `@`-mention the rule |

- Keep always-apply rules to a few lines of truly universal guidance. Turn the rest into glob-scoped or description-based rules.
- Keep each rule under 500 lines (official guidance); split large ones into composable rules and reference files instead of copying their contents.
- Migrate a legacy `.cursorrules` file into scoped `.mdc` rules.
- `AGENTS.md` (root or nested; the nearest wins) works as a plain alternative. Do not duplicate the same content in rules and AGENTS.md.

Always-on snippet as a rule:

```markdown
---
description: Token discipline for every task
alwaysApply: true
---
(contents of assets/always-on.md)
```

## 2. Context

- Start a new chat per task. Every earlier message is resent with each new one.
- `/summarize` (or a fresh chat with a short summary) well before the context limit; quality also drops as the window fills.
- Mention exact files with `@file` rather than pulling in the whole codebase for a narrow question.
- Add build output, logs, large data files and generated code to `.cursorignore` if `.gitignore` does not already exclude them.

## 3. Models and modes

- Use Auto or Composer for routine work; they draw from the Cursor models pool.
- Use a frontier third-party model for hard design and debugging, then switch back.
- Avoid Max Mode unless the normal context window is genuinely too small.
- Thinking variants of models spend more tokens per request; use them where reasoning matters.

## 4. MCP servers

Every enabled server offers its tools to the model. Turn off servers you are not using in Cursor Settings > MCP, and remove stale entries from `.cursor/mcp.json` and `~/.cursor/mcp.json`.

## 5. Spending controls

- The dashboard's Spending tab shows real-time usage, the remaining included amount and on-demand charges.
- Set an on-demand spending limit so running out of the included pool does not turn into an open-ended bill.
- Usage resets with the billing cycle and does not roll over; see [budget.md](budget.md) for pacing.

## 6. Prompting habits to suggest to the user

- Name the file, the function and the done condition; add a test or expected output.
- Put all corrections in one message.
- Edit trivial things by hand or with Tab completion.

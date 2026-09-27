# Planning against usage windows

Read this when the user asks how to pace their usage, is close to a limit, or wants to know when to use the expensive model.

## Windows by product

Snapshot as of 2026-09. Plans and numbers change often, so check the official page before quoting a number to the user.

| Product | Limit windows | Where to check |
| --- | --- | --- |
| Claude (Pro, Max, Team, Enterprise) | Rolling 5-hour window plus a weekly window, shared across Claude Code, claude.ai chat and Cowork | `/usage` in Claude Code; claude.ai Settings > Usage |
| ChatGPT plans with Codex | 5-hour window plus weekly limits; local tasks and cloud tasks share the allowance | `/status` in the Codex CLI; the status line can show both limits |
| GitHub Copilot | Monthly AI Credits (usage-based billing since 2026-06-01, 1 credit = $0.01); no rollover | GitHub billing and usage pages; budgets |
| Cursor | Monthly usage pools (Cursor models, other models); no rollover | Dashboard > Spending tab |
| OpenCode Go | 5 hours = 20%, week = 50%, month = 100% of the model's monthly allowance | OpenCode console |
| OpenCode Zen | Pay-as-you-go balance with optional monthly limits | OpenCode console |

## Decision rule

Do not use a fixed rule like "start saving below 30% remaining". Compare what is left with what must still get done:

```
slack = remaining allowance - work you must finish before the next reset
```

- **Slack is high and the reset is near:** spend it. Unused capacity in a 5-hour window, or in a monthly pool that does not roll over, is simply lost. This is the time for heavy work: big refactors, planning with the flagship model, broad reviews.
- **Slack is low:** move routine work to a cheaper model or lower reasoning effort, defer optional work, keep sessions short, and save the flagship model for the task that really needs it.
- **Slack is negative:** finish only must-do work, split it into small sessions, and consider the product's paid overflow (usage credits, on-demand usage, a Zen balance) only if the deadline is worth it.

For monthly pools, check the burn rate mid-month: expected use so far is roughly `allowance x (day of cycle / days in cycle)`. Being well above that line early is the signal to change habits, not the last day.

## Timing tactics

- **Start heavy, context-hungry work in a fresh session** at the start of a window, not deep into a long session where every request carries the old history.
- **Mind idle breaks.** Cached context expires (for Claude Code: one hour for the main conversation on a subscription, five minutes on an API key or while drawing on usage credits). The first request after a long break re-reads the whole history at full price, so after a long break prefer a fresh session or a resume-from-summary over continuing a huge one.
- **Background loops cost full context each time.** Scheduled tasks, polling loops and idle check-ins resend the whole session on every run. Keep them few, keep their sessions small, and give them long intervals.
- **Parallel agents multiply usage.** Each subagent or teammate has its own context and reloads the instruction files. Anthropic measured agents at about 4x the tokens of a chat and multi-agent setups at about 15x. A community test of a one-step task in Claude Code cost about 2.4x with a subagent, while a multi-stage task cost about 0.4x, because each stage started clean instead of dragging the history along. Delegate for isolation of large output or genuinely parallel reading, not by habit.
- **Track usage by kind of work,** not only the percentage meter. After a week or two you know what a typical feature, review or debugging session costs, which makes the slack estimate much more accurate.

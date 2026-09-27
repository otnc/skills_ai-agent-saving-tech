# Claude Code facts (snapshot 2026-09)

Numbers and behavior change with releases. Quote them with the date, and check the source when the answer matters.

## Limits

- Pro, Max, Team and Enterprise plans have a rolling 5-hour window plus a weekly window, shared across Claude Code, claude.ai chat and Cowork.
- "You've hit your session limit" and "weekly limit" apply to all models, so `/model` does not help. After a model-specific message ("Opus limit"), switching to another model family does.
- Usage credits (`/usage-credits`) let you continue past the plan limit at API rates. While on usage credits, the main conversation's cache lifetime drops from 1 hour to 5 minutes unless you set `promptCacheTtl`.
- Since v2.1.234, Claude Code can wait for the reset and continue the interrupted task (`/rate-limit-options`).

## Why a long session gets expensive

- Every request resends the full conversation. With caching the old part is billed at the cached rate, but a one-line question in a day-long session still pays for the whole history.
- Cache lifetime: 1 hour for the main conversation on a subscription within plan usage; 5 minutes on an API key, a cloud provider, or usage credits; 5 minutes for subagents by default.
- Actions that invalidate the cache: switching models, changing effort (except Opus 5.5 and Fable 5.1 on an API key or subscription), turning on fast mode, connecting or removing MCP servers whose tools load into the prefix, enabling or disabling plugins with MCP servers, denying a whole tool, compaction, piling up many images, upgrading Claude Code.
- Actions that keep it: editing files, editing CLAUDE.md (applies only after `/clear`, `/compact` or restart), changing permission mode or output style, invoking skills, `/recap`, `/rewind`, spawning subagents.
- `/compact` itself is a request over the whole history. `/clear` costs nothing.

## Costs

- Output tokens cost several times input tokens (5x on current Claude models); cache reads cost about a tenth of input.
- Thinking tokens bill as output. Opus 5.5 and Fable models always think; lower effort instead of disabling thinking.
- Agent teams: roughly 7x the tokens of a standard session when teammates run in plan mode.
- Subagents: each one sends its own requests against the same limits. A community measurement (Qiita, 2026) found a one-step task cost about 2.4x with a subagent and 13.9x with an agent team, while a multi-stage task cost about 0.4x with subagents because each stage started with a clean context.
- Background usage (session summaries for `--resume`, some status commands) is typically under $0.04 per session.
- Enterprise average: about $13 per developer per active day, $150-250 per month; under $30 per active day for 90% of users.

## Sources

- Manage costs: https://code.claude.com/docs/en/costs
- Prompt caching: https://code.claude.com/docs/en/prompt-caching
- Model configuration (effort, opusplan, autoCompactWindow): https://code.claude.com/docs/en/model-config
- Subagents (when to use them, model, CLAUDE_CODE_SUBAGENT_MODEL): https://code.claude.com/docs/en/sub-agents
- How and when to use subagents in Claude Code: https://claude.com/blog/subagents-in-claude-code
- Subagent and agent team token measurements (Qiita, ja): https://qiita.com/yokei_makoto/items/4d22d642147a93cd8731
- Memory (CLAUDE.md size, rules, imports, AGENTS.md): https://code.claude.com/docs/en/memory
- Environment variables: https://code.claude.com/docs/en/env-vars
- Usage limit best practices: https://support.claude.com/en/articles/9797557-usage-limit-best-practices
- Models, usage, and limits in Claude Code: https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code

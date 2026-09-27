# OpenCode facts (snapshot 2026-09)

Model lists, allowances and free models change often. Quote these with the date, and check the source when the answer matters.

## OpenCode Go

- $10/month for a curated set of open coding models.
- Limits per model: 5 hours = 20% of the monthly allowance, week = 50%, month = 100%. Example from the docs: a model with a $60 monthly allowance allows $12 per 5 hours, $30 per week and $60 per month.
- Monthly allowances ranged from about $15 to $60 per model. The docs' estimated monthly request counts varied from under 1,000 for the most expensive models to over 100,000 for the cheapest ones, so model choice matters far more than any other habit.
- With Zen credits, "Use balance" makes Go fall back to the Zen balance after a limit instead of blocking.
- A couple of models were free with unlimited usage for a limited time.

## OpenCode Zen

- Pay-as-you-go, priced per million input and output tokens per model; some models list cached read and write prices.
- Several models are free for a limited time.
- Auto reload tops up the balance when it falls below a threshold ($20 when under $5 by default); workspaces can set monthly limits for the whole workspace and per member, and admins can enable or disable models.

## Config keys

- `small_model` for light tasks such as title generation; `compaction.auto` (default true), `compaction.prune` (default false), `compaction.reserved`; `agent.<name>.model`; `instructions`; `mcp.<name>.enabled`; `watcher.ignore`.

## Sources

- Go: https://opencode.ai/docs/go/
- Zen: https://opencode.ai/docs/zen/
- Config: https://opencode.ai/docs/config/

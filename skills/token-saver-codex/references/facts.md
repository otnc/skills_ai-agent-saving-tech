# Codex facts (snapshot 2026-09)

Numbers and model names change often. Quote them with the date, and check the source when the answer matters.

## Limits

- ChatGPT plans include Codex usage with a 5-hour window; weekly limits may also apply. Local messages and cloud tasks share the plan's allowance.
- The pricing page gives estimated messages per 5 hours by model. The spread between models is large: on Plus, the page listed roughly 5-45 messages for the largest model, 15-150 for the mid-size one and 350-3,000 for the smallest, with Pro tiers scaling these up. Picking the smaller model for routine work multiplies how much fits in a window.
- Fast mode (service tier "fast") consumes about 2.5x the credits.
- Usage beyond the plan draws on credits, priced per million tokens with cached input much cheaper than fresh input.

## Official tips for making usage go further

- Control prompt size: be precise and remove unnecessary context.
- Limit source material to the relevant files; narrow sources or date ranges.
- Match the output to the need: audience, format, length; separate required from optional work.
- Reduce the size of AGENTS.md; nest files per directory in larger projects.
- Disable MCP servers you do not need; each one adds context.
- Use the smaller model for light tasks.

## AGENTS.md loading

- Codex skips empty files and stops adding instruction files once the combined size reaches `project_doc_max_bytes` (32 KiB by default). Instructions near the end of an oversized file are dropped silently.

## Sources

- Pricing and usage limits: https://developers.openai.com/codex/pricing
- Best practices: https://developers.openai.com/codex/learn/best-practices
- Subagents: https://developers.openai.com/codex/subagents
- Sample configuration: https://developers.openai.com/codex/config-sample
- AGENTS.md guide: https://developers.openai.com/codex/guides/agents-md
- Using Codex with your ChatGPT plan: https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- Status line with 5-hour and weekly limits (Qiita, ja): https://qiita.com/Uyuki_0409/items/2ee235b7f8ff3b077a19

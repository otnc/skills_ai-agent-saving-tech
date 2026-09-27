# Cursor facts (snapshot 2026-09)

Cursor's plans and model lineup change often. Quote these with the date, and check the source when the answer matters.

## Usage

- Paid plans have two monthly usage pools: Cursor models (Composer and other Cursor-served models listed in the docs) and other models. Pro, Pro Plus and Ultra include both; the entry plan includes only the Cursor models pool.
- Third-party models are billed at the provider's API price, so how far the included amount goes depends on the model and on how much context each request carries.
- Usage resets with the monthly billing cycle; unused usage does not carry over.
- When the included usage runs out, on-demand usage applies if it is enabled.
- Max Mode expands the context window (up to about 1M tokens on some models) and costs more per request; on legacy billing plans it was API rate plus 20%.

## Sources

- Usage and limits: https://cursor.com/help/models-and-usage/usage-limits
- Models and pricing: https://cursor.com/docs/models-and-pricing
- Rules: https://cursor.com/docs/context/rules
- Dynamic context discovery (blog): https://cursor.com/blog/dynamic-context-discovery

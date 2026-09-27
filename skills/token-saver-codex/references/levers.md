# Codex levers

Keys are from the official sample configuration (see [facts.md](facts.md) for links). User config: `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`); project config: `.codex/config.toml`.

## 1. A lean default config

```toml
# Default to a mid-size model and modest effort; raise per task with /model.
model_reasoning_effort = "low"        # minimal | low | medium | high | xhigh
plan_mode_reasoning_effort = "high"   # think hard only while planning
model_verbosity = "low"               # shorter answers, same work
model_reasoning_summary = "auto"

# Keep single tool outputs and the running history in check.
tool_output_token_limit = 12000       # tokens stored per tool output
model_auto_compact_token_limit = 64000  # compact earlier; unset uses the model default

# Instructions: stay under the cap instead of raising it.
project_doc_max_bytes = 32768

web_search = "cached"                 # "live" pulls fresh pages into context
# service_tier = "fast"               # leave off unless speed matters: costs more credits per request
```

Trade-offs to explain to the user:

- A low `tool_output_token_limit` keeps sessions long but can cut off the part of an output that matters; the agent should filter output at the source (see the core rules) rather than rely on truncation.
- A low `model_auto_compact_token_limit` compacts earlier, which keeps requests small but loses detail from early in the session. 64000 suits task-sized sessions; raise it for long refactors.
- `low` effort is right for scoped edits. For debugging, use `medium` or `high` for that task instead of retrying on `low`.

## 2. Profiles for switching quickly

Profiles let the user switch between a cheap default and a heavy setting without editing the main config. Select one with `codex --profile <name>`. Current docs keep each profile as a separate file under `$CODEX_HOME`; older versions used `[profiles.<name>]` tables in config.toml. Check which one the installed version uses before writing it. Typical pair:

- `cheap`: smaller model, `model_reasoning_effort = "low"`, `model_verbosity = "low"`
- `deep`: flagship model, `model_reasoning_effort = "high"`, for design and hard debugging only

## 3. MCP servers

Every MCP server adds context to each session. Disable what you do not use and narrow the rest:

```toml
[mcp_servers.docs]
command = "npx"
args = ["-y", "some-docs-mcp"]
enabled = false                            # keep the entry, stop loading it
# enabled_tools = ["search"]               # allow-list
# disabled_tools = ["slow-tool"]           # deny-list
```

Prefer CLIs (`gh`, `aws`) when they cover the same need.

## 4. AGENTS.md

- Put repo layout, build, test and lint commands, and hard conventions in AGENTS.md so they are not re-explained every session.
- Keep it lean: it is loaded into every session, and anything past `project_doc_max_bytes` is dropped silently.
- Global defaults go in `~/.codex/AGENTS.md`; directory-specific guidance in nested `AGENTS.md` files, which load only for work in that directory.
- Move repeatable procedures (release notes, log triage, review checklists) into skills (`.agents/skills/` or `~/.agents/skills/`); they load only when used.

## 5. Session commands

| Command | Use |
| --- | --- |
| `/new` | Fresh session for unrelated work |
| `/compact` | Summarize a long session at a natural break |
| `/resume` | Return to a saved session instead of rebuilding context by hand |
| `/fork` | Branch off to try something without polluting the main thread |
| `/model` | Change model and reasoning effort |
| `/status` | Session state and remaining limits |

The status line can show the 5-hour and weekly limits permanently; configure it in `config.toml` (see the Codex docs for the current keys).

## 6. Subagents

The Codex docs are explicit that subagent workflows consume more tokens than comparable single-agent runs, because each subagent does its own model and tool work. They pay off for read-heavy work that can run independently in parallel (exploration, tests, triage, summarizing a very large input) and returns distilled results to the main thread. Keep small tasks, sequential steps and all write-heavy work in the main thread.

## 7. Prompting habits to suggest to the user

- Be precise and drop unnecessary context: name the files, the function and the done condition.
- Give only relevant source material; narrow files or date ranges.
- State the audience, format and length of the output, and separate required work from optional improvements.
- Put all corrections in one message.

# Claude Code levers

Ordered roughly by impact. Keys and commands are from the official docs (see [facts.md](facts.md) for links). Settings live in `~/.claude/settings.json` (user), `.claude/settings.json` (project, shared) or `.claude/settings.local.json` (project, personal).

## 1. Keep always-loaded context small

Everything here is sent with every request of every session.

- **CLAUDE.md under 200 lines** per file (official target). Keep only what applies to almost every task: build and test commands, layout, hard conventions.
- **Move task-specific instructions into skills.** Skills load only when invoked, so PR-review checklists, migration steps and deployment procedures do not cost anything in unrelated sessions.
- **Path-scoped rules:** put file-type-specific rules in `.claude/rules/*.md` with `paths:` front matter. They load only when Claude reads a matching file. Rules without `paths:` load every session.

  ```markdown
  ---
  paths:
    - "src/api/**/*.ts"
  ---
  API handlers must validate input with zod.
  ```

- **Imports are not free.** `@path` imports in CLAUDE.md are expanded at launch, so an import only helps organize, not save.
- **One source for CLAUDE.md and AGENTS.md.** If both exist with the same content, keep AGENTS.md and put `@AGENTS.md` in CLAUDE.md.
- **Custom compaction focus:** add a section to CLAUDE.md so compaction keeps what matters:

  ```markdown
  # Compact instructions
  When compacting, keep test output, code changes and open decisions; drop exploration.
  ```

- **Skills:** each installed skill's name and description is always in context. Remove ones you do not use.

## 2. Manage the session

| Command | Effect |
| --- | --- |
| `/clear` | New context, costs nothing. Use when switching to unrelated work |
| `/compact [focus]` | Summarizes history. Costs one request over the whole context (cheap while the cache is warm, expensive after a long break). Run at a natural break, not mid-task |
| `/rewind` or Esc Esc | Cuts back to an earlier turn and reuses the cache. Better than compacting away a wrong path |
| `/rename`, `/resume` | Name a session before clearing, come back later |
| `/usage` | Plan usage bars; attribution to skills, subagents, plugins and MCP servers; flags for long context and cache misses; prompt cache hit rate |
| `/context` | What currently fills the context window |
| `/autocompact 200k` | Sets `autoCompactWindow`. On 1M-context models the default window is about 967K tokens, so each request can grow very large before compaction. A smaller window keeps requests cheaper; raise it only when you need the long context |
| `/insights` | Report on how you work and where friction (rework) happens |

Also: after a long break, Claude Code offers to resume from a summary instead of resending the full history. Accept it for large sessions.

## 3. Model, effort and thinking

- **Default to Sonnet for routine work;** use Opus or Fable for hard design and debugging. `/model opusplan` plans with Opus and executes with Sonnet (each plan-mode toggle is a model switch, so it restarts the cache).
- **Effort:** `/effort low|medium|high|xhigh|max`, the `effortLevel` setting, or `CLAUDE_CODE_EFFORT_LEVEL`. Thinking tokens bill as output. Lower effort for simple tasks. On Opus 5.5 and Fable 5.1 (API key or subscription), changing effort keeps the cache; on other models it invalidates it.
- **Fixed-budget models only:** `MAX_THINKING_TOKENS=8000` caps thinking. Adaptive-reasoning models ignore it; use effort instead.
- **Subagents: when they pay off.** Official guidance: use the main conversation for back-and-forth, for phases that share a lot of context, for quick targeted changes, and when latency matters, because a fresh subagent has to gather context first. Use subagents for verbose output you do not need afterwards, for tool restrictions, and for self-contained work that returns a summary. Anthropic's rule of thumb: exploring ten or more files, or three or more independent pieces of work. Each subagent loads its own system prompt, the task brief, every CLAUDE.md level (unless its front matter sets `omitClaudeMd: true`), a git status snapshot and any preloaded skills, and its requests count toward the same limits.
- **Subagent model:** when you do delegate, make it cheap by default.

  ```json
  {
    "env": {
      "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
    }
  }
  ```

  Add `"CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "1"` to force it on every subagent, teammate and workflow agent (v2.1.257+). Per subagent, set front matter `model: haiku`, `effort: low` and a minimal `tools:` list.
- **Pick model and effort at the start of a session.** Switching models, changing effort on most models, and turning on fast mode mid-session re-read the whole history uncached.

## 4. Tools and MCP

- MCP tool definitions are deferred by default (only names and server instructions load), but each server still adds context. Disable unused servers with `/mcp`.
- **Prefer CLIs** (`gh`, `aws`, `gcloud`) over MCP servers that do the same thing: no per-tool listing.
- **Code intelligence plugins** (LSP) for typed languages: "go to definition" replaces grep plus reading several candidate files.
- `BASH_MAX_OUTPUT_LENGTH` (default 30000 characters) caps how much command output is read back. Lowering it saves tokens but can hide the error you need; prefer filtering at the source.

## 5. Hooks that preprocess output

A PreToolUse hook can rewrite test commands to return only failures. Official example, `~/.claude/hooks/filter-test-output.sh` (needs `jq`):

```bash
#!/bin/bash
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command')
if [[ "$cmd" =~ ^(npm test|pytest|go test) ]]; then
  filtered_cmd="$cmd 2>&1 | grep -A 5 -E '(FAIL|ERROR|error:)' | head -100"
  echo "$input" | jq --arg filtered "$filtered_cmd" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "allow", updatedInput: (.tool_input + {command: $filtered})}}'
else
  echo "{}"
fi
```

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "~/.claude/hooks/filter-test-output.sh" }] }
    ]
  }
}
```

Check with `/hooks`. The same pattern works for log files: grep for `ERROR` and return only matching lines.

## 6. Background usage that adds up

- **Scheduled tasks and `/loop`** send the full context on every run, even while idle. Keep them in small sessions with long intervals; `/usage` lists the heaviest loops.
- **Agent teams** use roughly 7x the tokens of a standard session when teammates run in plan mode. Keep teams small, use Sonnet for teammates, shut them down when done.
- **Goal check-ins:** set `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` to stop idle check-ins.
- **Cross-session messages:** set `crossSessionInbound` to `hold` so messages from other sessions do not wake an idle session.
- **Prompt suggestions** send a small cached request after each response; turn them off if you never use them.

## 7. Prompting habits to suggest to the user

- Name the file, function and expected result ("add input validation to `login` in `auth.ts`; `npm test auth` must pass") instead of "improve this".
- Put all corrections in one message instead of several small ones.
- Give a verification target (test, expected output, screenshot) so the first attempt can check itself.
- Edit trivial things (a typo, one word) by hand.

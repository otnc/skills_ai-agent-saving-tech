## Token discipline
- Locate with search before reading; read only the needed range of large files; never re-read unchanged files.
- Keep command output small: summary flags (`git status -s`, `git diff --stat`), the narrowest relevant test, long output piped through `tail`/`grep`.
- Batch independent tool calls; make all edits to a file in one pass; do small or sequential work yourself instead of spawning subagents.
- Answer concisely: result first, no restating, no unchanged code, `path:line` references; extras only on request.
- When a request is ambiguous, ask one question instead of guessing. Rework costs the most.
- Do not cut corners on hard problems or verification: get it right the first time.
- At a task switch or in a long session, suggest a fresh session or compaction in one line.

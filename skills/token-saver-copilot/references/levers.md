# GitHub Copilot levers

## 1. Pick the model per task

Under usage-based billing every model is priced at its own per-token rate, so the model picker is the biggest single lever.

- Default to a cheap, fast model (or Auto) for questions, small edits and boilerplate.
- Switch to a premium model for design, tricky debugging or large refactors, then switch back.
- Check the current per-model prices on the "Models and pricing" page before recommending a specific model; they change often and some models have promotional pricing.

## 2. Keep instructions small and scoped

Copilot adds custom instructions to requests in the repository.

- `.github/copilot-instructions.md`: repository-wide, applies to every request. Keep it short: build and test commands, layout, hard conventions.
- `.github/instructions/<name>.instructions.md`: path-specific. Scope each with `applyTo`, and avoid `applyTo: "**"`, which makes it apply everywhere.

  ```markdown
  ---
  applyTo: "src/api/**/*.ts"
  ---
  API handlers validate input with zod and return typed errors.
  ```

  Use `excludeAgent: "code-review"` or `"cloud-agent"` to keep a file out of the agent that does not need it.
- `AGENTS.md` (nearest one wins), plus `CLAUDE.md` or `GEMINI.md` at the root, are read as agent instructions. Do not repeat the same content in both `copilot-instructions.md` and `AGENTS.md`.
- Reusable procedures belong in prompt files (`.github/prompts/*.prompt.md`) or skills, which load only when used.

## 3. Control what goes into context

- Attach exactly what is needed: `#file`, a selection, or `#changes`, rather than `#codebase` for a narrow question.
- Start a new chat session per task. Old turns are resent with every new message and now cost tokens each time.
- In Copilot CLI, use `/clear` for a new task and `/compact` for a long one, and check `/context` and `/usage` if your version has them.

## 4. MCP servers and tools

- Every enabled tool is offered to the model. In agent mode, open the tool picker and deselect servers and tools the task does not need.
- Remove servers you never use from `.vscode/mcp.json` or the user MCP configuration.
- Prefer CLIs (`gh`) the agent can run in the terminal when they cover the same need.

## 5. Heavy features

- **Code review:** each review is a large request (under the legacy request-based billing it counted as 13 premium requests from 2026-06-01). Request reviews on finished, focused PRs.
- **Cloud agent:** a whole session runs per assignment. Give it a well-scoped issue with acceptance criteria so it does not wander or need a second run.
- **Free features:** inline completions and next edit suggestions do not consume AI Credits on paid plans.

## 6. Budgets and monitoring

- Set a budget in GitHub billing settings (personal, or enterprise, cost center and user level for organizations). Choose whether to stop at the budget or allow overage.
- Check the usage page mid-cycle against the expected burn rate (see [budget.md](budget.md)). Unused included credits do not roll over.

## 7. Prompting habits to suggest to the user

- Name the file, the function and the done condition; add a test or expected output.
- Put all corrections in one message.
- For a one-word fix, edit it by hand or let completions do it.

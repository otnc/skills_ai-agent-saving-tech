# ai-agent-saving-tech

:::kiritan{locale=en}
Agent Skills that make AI coding agents use fewer tokens and stretch their usage limits (5-hour, weekly and monthly caps, credits, API spend) without lowering the quality of the work.

There is one skill per agent, plus an agent-neutral one:

| Skill | For | Covers |
| --- | --- | --- |
| `token-saver-claude-code` | Claude Code | `/clear` vs `/compact`, prompt cache behavior, CLAUDE.md and path-scoped rules, `opusplan`, `/effort`, subagent model, hooks that trim test output, background usage |
| `token-saver-codex` | OpenAI Codex | `model_reasoning_effort`, `model_verbosity`, `tool_output_token_limit`, auto-compaction, the 32 KiB AGENTS.md cap, fast mode, MCP servers, profiles |
| `token-saver-copilot` | GitHub Copilot | Usage-based billing (AI Credits), model choice, free completions, `applyTo`-scoped instructions, tool picker, code review and cloud agent cost, budgets |
| `token-saver-cursor` | Cursor | Usage pools, Auto and Composer, Max Mode, rule types (`alwaysApply`, `globs`), `.cursorignore`, spending limits |
| `token-saver-opencode` | OpenCode | Go's 5-hour, weekly and monthly limits, Zen balance, `small_model`, `compaction.prune`, per-agent models |
| `token-saver` | Any agent | The same core rules and a map of where each lever lives in other agents (Gemini CLI, Windsurf, Cline, Roo Code and more) |
:::

:::kiritan{locale=ja}
AI コーディングエージェントのトークン消費を抑え、使用量制限(5 時間枠・週間枠・月間枠、クレジット、API 料金)を長持ちさせるための Agent Skills です。作業の質は落としません。

エージェントごとに 1 つずつと、エージェントを問わない汎用版を用意しています。

| スキル | 対象 | 主な内容 |
| --- | --- | --- |
| `token-saver-claude-code` | Claude Code | `/clear` と `/compact` の使い分け、プロンプトキャッシュの挙動、CLAUDE.md とパス限定ルール、`opusplan`、`/effort`、サブエージェントのモデル、テスト出力を絞る hook、バックグラウンド消費 |
| `token-saver-codex` | OpenAI Codex | `model_reasoning_effort`、`model_verbosity`、`tool_output_token_limit`、自動コンパクション、AGENTS.md の 32 KiB 上限、fast mode、MCP サーバー、プロファイル |
| `token-saver-copilot` | GitHub Copilot | 使用量ベース課金(AI Credits)、モデル選択、無料の補完、`applyTo` で範囲を絞った指示ファイル、ツールピッカー、コードレビューとクラウドエージェントのコスト、予算設定 |
| `token-saver-cursor` | Cursor | 使用量プール、Auto と Composer、Max Mode、ルールの種類(`alwaysApply`・`globs`)、`.cursorignore`、支出上限 |
| `token-saver-opencode` | OpenCode | Go の 5 時間・週・月の制限、Zen 残高、`small_model`、`compaction.prune`、エージェント別モデル |
| `token-saver` | すべてのエージェント | 共通のコアルールと、他のエージェント(Gemini CLI、Windsurf、Cline、Roo Code など)で各設定がどこにあるかの対応表 |
:::

:::kiritan{locale=en}
## What the skills do

Each skill has two jobs.

1. **Work lean.** While the skill is active, the agent follows a short set of core rules: locate before reading, read only the needed range, keep command output small, batch tool calls, answer concisely, do small or sequential work itself instead of spawning subagents (and delegate only large read-only or parallel work, to a cheap model), and suggest a fresh session or compaction at natural breaks. The rules also say where not to save: hard problems and verification get the reading and reasoning they need, because rework is the most expensive thing an agent can do.
2. **Tune the setup.** When you ask for an audit, the agent runs a read-only script that measures what is loaded into every request (instruction files, unscoped rules, MCP servers, skill descriptions) and checks the settings that drive token use, then proposes concrete changes and applies them only after you agree.

Skills load only when triggered, so each skill also offers to add a seven-line "token discipline" section to your always-loaded instruction file (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` or a Cursor rule). That keeps the lean-work rules in effect in every session for about 200 tokens.
:::

:::kiritan{locale=ja}
## スキルがやること

どのスキルも役割は 2 つです。

1. **無駄なく作業する。** スキルが有効な間、エージェントは短いコアルールに従います。読む前に検索で場所を特定する、必要な範囲だけ読む、コマンド出力を小さく保つ、ツール呼び出しをまとめる、簡潔に答える、小さな作業や順番に進める作業はサブエージェントに投げず自分でこなす(委任するのは大量の読み取りや並列にできる独立作業だけで、安いモデルを使う)、区切りのよいところで新しいセッションやコンパクションを提案する、といった内容です。節約してはいけない場面も明記しています。難しい問題と検証には必要なだけ読んで考えさせます。手戻りこそが最も高くつくからです。
2. **設定を見直す。** 監査を頼むと、エージェントが読み取り専用のスクリプトを実行し、毎回のリクエストに載っているもの(指示ファイル、範囲指定のないルール、MCP サーバー、スキルの説明文)と、トークン消費に効く設定を点検します。そのうえで具体的な変更案を示し、同意を得てから適用します。

スキルは呼び出されたときにしか読み込まれません。そのため各スキルは、常時読み込まれる指示ファイル(`CLAUDE.md`、`AGENTS.md`、`.github/copilot-instructions.md`、Cursor のルール)に 7 行の"Token discipline"セクションを追記することも提案します。約 200 トークンで、全セッションにコアルールが効くようになります。
:::

:::kiritan{locale=en}
## Install

Install with the [skills CLI](https://github.com/vercel-labs/skills). Pick the skill for your agent and pass the matching `--agent`:

```bash
# Claude Code
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-claude-code -a claude-code

# Codex
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-codex -a codex

# GitHub Copilot
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-copilot -a github-copilot

# Cursor
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-cursor -a cursor

# OpenCode
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-opencode -a opencode

# Any other agent
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver -a <agent>
```

- Add `-g` to install for your user (all projects) instead of the current project.
- Run `npx skills add otnc/skills_ai-agent-saving-tech --list` to see the skills, or run it without `--skill` to choose interactively.
- If you use several agents, install each one's dedicated skill for that agent. Installing `token-saver` next to a dedicated skill for the same agent only duplicates the core rules.

Without the CLI, copy a folder from `skills/` into your agent's skills directory (for example `~/.claude/skills/` or `.agents/skills/`).
:::

:::kiritan{locale=ja}
## インストール

[skills CLI](https://github.com/vercel-labs/skills) でインストールします。使っているエージェント向けのスキルを選び、対応する `--agent` を指定してください。

```bash
# Claude Code
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-claude-code -a claude-code

# Codex
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-codex -a codex

# GitHub Copilot
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-copilot -a github-copilot

# Cursor
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-cursor -a cursor

# OpenCode
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver-opencode -a opencode

# その他のエージェント
npx skills add otnc/skills_ai-agent-saving-tech --skill token-saver -a <agent>
```

- 現在のプロジェクトではなくユーザー全体(全プロジェクト)に入れるときは `-g` を付けます。
- `npx skills add otnc/skills_ai-agent-saving-tech --list` でスキル一覧を確認できます。`--skill` を省くと対話形式で選べます。
- 複数のエージェントを使う場合は、それぞれの専用スキルをそのエージェントに入れてください。同じエージェントに専用スキルと `token-saver` を両方入れても、コアルールが重複するだけです。

CLI を使わない場合は、`skills/` 内のフォルダをエージェントのスキル用ディレクトリ(`~/.claude/skills/` や `.agents/skills/` など)にコピーします。
:::

:::kiritan{locale=en}
## Usage

Ask in your own words, for example:

- "I keep hitting the 5-hour limit. Audit my setup."
- "Why is my usage so high today?"
- "トークンを節約する設定にして"

To run the audit yourself (Node.js 18+, no dependencies, read-only):

```bash
node .claude/skills/token-saver-claude-code/scripts/audit.mjs --agent claude-code
node <skill-dir>/scripts/audit.mjs --agent all --json
```

Example output:

```
== codex ==
Always-loaded instructions: ~3.1k tokens (AGENTS.md 262L)
WARN AGENTS.md: 262 lines (~3.1k tokens), loaded on every request. Aim for under 200: move task-specific parts into skills or path-scoped rules.
WARN model_reasoning_effort = "high" for every task. Use "low" or "medium" as the default and raise it per task (/model), or set plan_mode_reasoning_effort for planning only.
NOTE tool_output_token_limit is unset. A limit such as 12000 keeps one huge command output from filling the context.
```
:::

:::kiritan{locale=ja}
## 使い方

普段の言葉で頼めば動きます。

- "5 時間制限にすぐ引っかかる。設定を監査して"
- "今日の使用量が多い理由を調べて"
- "Audit my setup for token usage."

監査スクリプトは自分でも実行できます(Node.js 18 以上、依存なし、読み取り専用)。

```bash
node .claude/skills/token-saver-claude-code/scripts/audit.mjs --agent claude-code
node <skill-dir>/scripts/audit.mjs --agent all --json
```

出力例:

```
== codex ==
Always-loaded instructions: ~3.1k tokens (AGENTS.md 262L)
WARN AGENTS.md: 262 lines (~3.1k tokens), loaded on every request. Aim for under 200: move task-specific parts into skills or path-scoped rules.
WARN model_reasoning_effort = "high" for every task. Use "low" or "medium" as the default and raise it per task (/model), or set plan_mode_reasoning_effort for planning only.
NOTE tool_output_token_limit is unset. A limit such as 12000 keeps one huge command output from filling the context.
```
:::

:::kiritan{locale=en}
## Design

- **The skills are small themselves.** Each `SKILL.md` is about 80 lines (roughly 1,500 tokens). Detailed commands, settings and pricing live in `references/` and are read only when needed.
- **Facts are dated and sourced.** Limits and prices change often, so every `references/facts.md` carries a snapshot date and links to the official pages, and the agent is told to verify before quoting a number.
- **Written in English** so the always-loaded parts stay cheap (English usually takes fewer tokens than the same content in Japanese). The descriptions include Japanese trigger phrases, and the agent still answers in your language.
:::

:::kiritan{locale=ja}
## 設計方針

- **スキル自体も小さく。** 各 `SKILL.md` は約 80 行(約 1,500 トークン)です。コマンドや設定、料金の詳細は `references/` に分け、必要なときだけ読ませます。
- **事実には日付と出典を付ける。** 制限や料金は頻繁に変わるため、各 `references/facts.md` にはスナップショットの日付と公式ページへのリンクを載せ、数値を伝える前に確認するよう指示しています。
- **本文は英語で書く。** 常時読み込まれる部分を安く保つためです(同じ内容なら英語のほうが日本語よりトークン数が少なくなりやすい)。description には日本語のトリガー語も含めており、エージェントは利用者の言語で答えます。
:::

:::kiritan{locale=en}
## Layout

```
skills/
├── token-saver/                 # agent-neutral
├── token-saver-claude-code/
│   ├── SKILL.md                 # core rules + agent specifics + audit workflow
│   ├── references/
│   │   ├── levers.md            # every command and setting that affects usage
│   │   ├── facts.md             # limits and pricing snapshot with sources
│   │   └── budget.md            # pacing against 5-hour / weekly / monthly windows
│   ├── assets/always-on.md      # snippet for the always-loaded instruction file
│   └── scripts/audit.mjs        # read-only setup audit
├── token-saver-codex/
├── token-saver-copilot/
├── token-saver-cursor/
└── token-saver-opencode/
shared/                          # single source for the files copied into every skill
scripts/sync.mjs                 # copies shared/ into skills/ (--check in CI)
scripts/validate.mjs             # checks SKILL.md against the Agent Skills spec
tests/audit.test.mjs
base/README.base.md              # source of README.md and README.ja.md (built by kiritan)
.agents/skills/kiritan/          # kiritan's own skill, for agents editing the README
```
:::

:::kiritan{locale=ja}
## 構成

```
skills/
├── token-saver/                 # 汎用版
├── token-saver-claude-code/
│   ├── SKILL.md                 # コアルール + エージェント固有の要点 + 監査の手順
│   ├── references/
│   │   ├── levers.md            # 使用量に効くコマンドと設定の一覧
│   │   ├── facts.md             # 制限・料金のスナップショットと出典
│   │   └── budget.md            # 5 時間・週・月の枠に合わせた配分の考え方
│   ├── assets/always-on.md      # 常時読み込みの指示ファイルに追記するスニペット
│   └── scripts/audit.mjs        # 読み取り専用の設定監査
├── token-saver-codex/
├── token-saver-copilot/
├── token-saver-cursor/
└── token-saver-opencode/
shared/                          # 全スキルに配る共通ファイルの原本
scripts/sync.mjs                 # shared/ を skills/ に複製(CI では --check)
scripts/validate.mjs             # SKILL.md を Agent Skills 仕様に照らして検証
tests/audit.test.mjs
base/README.base.md              # README.md と README.ja.md の原本(kiritan でビルド)
.agents/skills/kiritan/          # README を編集するエージェント向けの kiritan スキル
```
:::

:::kiritan{locale=en}
## Development

The skills and scripts need only Node.js 18+. Building the README needs Node.js 22.7+ for [kiritan](https://github.com/otnc/kiritan), installed as a dev dependency with `npm install`.

Edit the shared parts (core rules, always-on snippet, budget guide, audit script) in `shared/`, then copy them into every skill:

```bash
npm run sync                     # copy shared/ into skills/
npm run validate                 # Agent Skills spec + sync check (CI)
npm test
```

`README.md` and `README.ja.md` are generated. Edit `base/README.base.md`, which holds both languages in `:::kiritan{locale=...}` blocks, then rebuild:

```bash
npm run docs:build               # regenerate README.md and README.ja.md
npm run docs:verify              # confirm they match the base file (CI)
```

The repository also carries [kiritan's own skill](https://github.com/otnc/kiritan/tree/main/skills/kiritan) in `.agents/skills/kiritan/`, which agents that read `.agents/skills/` (Codex, Cursor, GitHub Copilot, OpenCode and others) pick up directly. Claude Code reads `.claude/skills/`, which is not committed; run `npx skills add otnc/kiritan --skill kiritan -a claude-code` once to link it there.
:::

:::kiritan{locale=ja}
## 開発

スキルとスクリプトの実行に必要なのは Node.js 18 以上だけです。README のビルドには [kiritan](https://github.com/otnc/kiritan) を使うため Node.js 22.7 以上が必要で、kiritan は `npm install` で devDependencies として入ります。

共通部分(コアルール、常時読み込みスニペット、予算ガイド、監査スクリプト)は `shared/` で編集し、全スキルに複製します。

```bash
npm run sync                     # shared/ を skills/ に複製
npm run validate                 # Agent Skills 仕様と同期状態の検証(CI)
npm test
```

`README.md` と `README.ja.md` は生成物です。両言語を `:::kiritan{locale=...}` ブロックで持つ `base/README.base.md` を編集し、再ビルドしてください。

```bash
npm run docs:build               # README.md と README.ja.md を再生成
npm run docs:verify              # 原本と一致しているか確認(CI)
```

このリポジトリには、README を編集するエージェント向けに [kiritan のスキル](https://github.com/otnc/kiritan/tree/main/skills/kiritan) を `.agents/skills/kiritan/` に同梱しています。`.agents/skills/` を読むエージェント(Codex、Cursor、GitHub Copilot、OpenCode など)はそのまま使えます。Claude Code は `.claude/skills/` を読みますが、こちらはコミットしていないので、一度 `npx skills add otnc/kiritan --skill kiritan -a claude-code` を実行してリンクしてください。
:::

:::kiritan{locale=en}
## Sources

The rules and settings are based on official documentation and on articles from Qiita, Zenn and note, including:

- [Claude Code: Manage costs effectively](https://code.claude.com/docs/en/costs), [Prompt caching](https://code.claude.com/docs/en/prompt-caching)
- [Codex pricing](https://developers.openai.com/codex/pricing), [Codex best practices](https://developers.openai.com/codex/learn/best-practices)
- [GitHub Copilot is moving to usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)
- [Cursor usage and limits](https://cursor.com/help/models-and-usage/usage-limits), [Cursor rules](https://cursor.com/docs/context/rules)
- [OpenCode Go](https://opencode.ai/docs/go/), [OpenCode Zen](https://opencode.ai/docs/zen/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Qiita: @ktdatascience's guide to reducing Claude usage](https://qiita.com/ktdatascience/items/8f867d957ba29133bc32)
- [Claude Codeのトークンコストを、仕組みから理解して削る (Zenn)](https://zenn.dev/acntechjp/articles/f00b201cabcc39)
- [Claude Codeのトークン消費を減らす方法 (Zenn)](https://zenn.dev/yurukusa/articles/gvq329nn88wsna)
- [Claude Code・Codexのトークン消費を抑える技術30選 (note)](https://note.com/kawaidesign/n/n067cab520432)
- [Codex・Claude Codeの利用制限、残量%で節約していませんか (SuzuLabo)](https://suzulabo.co.jp/ai/834/)
:::

:::kiritan{locale=ja}
## 参考資料

ルールと設定は、公式ドキュメントと Qiita・Zenn・note の記事をもとにしています。主なものは次のとおりです。

- [Claude Code: Manage costs effectively](https://code.claude.com/docs/en/costs)、[Prompt caching](https://code.claude.com/docs/en/prompt-caching)
- [Codex pricing](https://developers.openai.com/codex/pricing)、[Codex best practices](https://developers.openai.com/codex/learn/best-practices)
- [GitHub Copilot is moving to usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)
- [Cursor usage and limits](https://cursor.com/help/models-and-usage/usage-limits)、[Cursor rules](https://cursor.com/docs/context/rules)
- [OpenCode Go](https://opencode.ai/docs/go/)、[OpenCode Zen](https://opencode.ai/docs/zen/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Qiita: @ktdatascience さんの Claude 使用量削減ガイド](https://qiita.com/ktdatascience/items/8f867d957ba29133bc32)
- [Claude Codeのトークンコストを、仕組みから理解して削る (Zenn)](https://zenn.dev/acntechjp/articles/f00b201cabcc39)
- [Claude Codeのトークン消費を減らす方法 (Zenn)](https://zenn.dev/yurukusa/articles/gvq329nn88wsna)
- [Claude Code・Codexのトークン消費を抑える技術30選 (note)](https://note.com/kawaidesign/n/n067cab520432)
- [Codex・Claude Codeの利用制限、残量%で節約していませんか (SuzuLabo)](https://suzulabo.co.jp/ai/834/)
:::

:::kiritan{locale=en}
## License

[MIT](LICENSE)
:::

:::kiritan{locale=ja}
## ライセンス

[MIT](LICENSE)
:::

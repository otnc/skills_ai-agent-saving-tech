#!/usr/bin/env node
// token-saver audit: reports what an AI coding agent loads into every request (instruction files, rules, MCP servers, skills) and the settings that drive token use.
// Plain Node.js 18+, no dependencies, read-only. It never modifies files.
// Usage: node audit.mjs [--agent <name[,name]>|all|auto] [--root <dir>] [--home <dir>] [--json]
// Agents: claude-code, codex, copilot, cursor, opencode. Default: auto (agents whose config is found).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AGENTS = ['claude-code', 'codex', 'copilot', 'cursor', 'opencode'];

// ---------- helpers ----------

export function estimateTokens(text) {
  // Rough and tokenizer-agnostic: ~4 ASCII characters per token, ~1 token per non-ASCII character (Japanese, Chinese, etc.).
  let ascii = 0;
  let other = 0;
  for (const ch of text) {
    if (ch.codePointAt(0) < 128) ascii++;
    else other++;
  }
  return Math.ceil(ascii / 4 + other);
}

export function nonAsciiRatio(text) {
  let other = 0;
  let total = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    total++;
    if (ch.codePointAt(0) >= 128) other++;
  }
  return total === 0 ? 0 : other / total;
}

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function lineCount(text) {
  if (!text) return 0;
  const n = text.split(/\r?\n/).length;
  return text.endsWith('\n') ? n - 1 : n;
}

function listFiles(dir, pred, depth = 4) {
  const out = [];
  if (!isDir(dir) || depth < 0) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFiles(p, pred, depth - 1));
    else if (pred(ent.name)) out.push(p);
  }
  return out.sort();
}

function listDirs(dir) {
  if (!isDir(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() || e.isSymbolicLink())
    .map((e) => path.join(dir, e.name))
    .sort();
}

// Removes // and /* */ comments and trailing commas outside strings, so JSONC config files parse with JSON.parse.
export function stripJsonc(text) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\') {
        out += n ?? '';
        i++;
      } else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
    } else if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && n === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function readJson(p) {
  const t = readText(p);
  if (t == null) return null;
  try {
    return JSON.parse(stripJsonc(t));
  } catch {
    return undefined; // exists but unparsable
  }
}

// Minimal TOML reader: top-level `key = value` pairs and the names of [tables], with the `enabled` key of each table. Enough for the keys this audit looks at.
export function parseTomlLite(text) {
  const top = {};
  const tables = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const t = line.match(/^\[+\s*([^\]]+?)\s*\]+$/);
    if (t) {
      current = t[1];
      tables[current] ??= {};
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
    else if (v === 'true' || v === 'false') v = v === 'true';
    else if (/^-?\d+$/.test(v)) v = Number(v);
    if (current == null) top[kv[1]] = v;
    else tables[current][kv[1]] = v;
  }
  return { top, tables };
}

// Minimal YAML front matter reader (flat `key: value` lines only).
export function frontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const obj = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
    obj[kv[1]] = v;
  }
  return obj;
}

// Share of the non-empty lines of `b` that also appear in `a`.
export function overlap(a, b) {
  const norm = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 8);
  const setA = new Set(norm(a));
  const linesB = norm(b);
  if (linesB.length === 0) return 0;
  return linesB.filter((l) => setA.has(l)).length / linesB.length;
}

function fmtTok(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ---------- report model ----------

class Report {
  constructor(agent) {
    this.agent = agent;
    this.findings = [];
    this.alwaysLoaded = []; // { label, lines, tokens }
  }
  warn(msg) {
    this.findings.push({ level: 'warn', msg });
  }
  note(msg) {
    this.findings.push({ level: 'note', msg });
  }
  ok(msg) {
    this.findings.push({ level: 'ok', msg });
  }
  load(label, text) {
    const entry = { label, lines: lineCount(text), tokens: estimateTokens(text) };
    this.alwaysLoaded.push(entry);
    return entry;
  }
  get alwaysTokens() {
    return this.alwaysLoaded.reduce((s, e) => s + e.tokens, 0);
  }
}

function checkInstructionFile(r, label, text, { maxLines = 200 } = {}) {
  const e = r.load(label, text);
  if (e.lines > maxLines) {
    r.warn(`${label}: ${e.lines} lines (~${fmtTok(e.tokens)} tokens), loaded on every request. Aim for under ${maxLines}: move task-specific parts into skills or path-scoped rules.`);
  }
  if (e.tokens > 400 && nonAsciiRatio(text) > 0.3) {
    r.note(`${label}: mostly non-English text. The same content in English usually takes noticeably fewer tokens; consider English for always-loaded files and keep replies in your own language.`);
  }
  return e;
}

function relLabel(p, ctx) {
  const home = ctx.home;
  const rel = path.relative(ctx.root, p);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  const relHome = path.relative(home, p);
  if (!relHome.startsWith('..') && !path.isAbsolute(relHome)) return '~/' + relHome.split(path.sep).join('/');
  return p;
}

// Expands `@path` imports (Claude Code CLAUDE.md syntax) outside code, up to 4 hops, returning the imported files' paths.
export function claudeImports(text, baseDir, seen = new Set(), depth = 0, home = os.homedir()) {
  if (depth >= 4) return [];
  const out = [];
  const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const m of withoutCode.matchAll(/(?:^|\s)@((?:~\/|\.{1,2}\/|\/)?[\w.\-/]+\.[\w]+)/g)) {
    let p = m[1];
    if (p.startsWith('~/')) p = path.join(home, p.slice(2));
    const abs = path.resolve(baseDir, p);
    if (seen.has(abs)) continue;
    const t = readText(abs);
    if (t == null) continue;
    seen.add(abs);
    out.push(abs, ...claudeImports(t, path.dirname(abs), seen, depth + 1, home));
  }
  return out;
}

function mcpNames(obj, key) {
  if (!obj || typeof obj !== 'object' || !obj[key] || typeof obj[key] !== 'object') return [];
  return Object.entries(obj[key])
    .filter(([, v]) => !(v && (v.enabled === false || v.disabled === true)))
    .map(([k]) => k);
}

function reportMcp(r, sources, hint) {
  const all = sources.flatMap((s) => s.names);
  if (all.length === 0) {
    r.ok('No MCP servers configured.');
    return;
  }
  const detail = sources.filter((s) => s.names.length).map((s) => `${s.label}: ${s.names.join(', ')}`).join('; ');
  const msg = `${all.length} MCP server(s) enabled (${detail}). ${hint}`;
  if (all.length > 6) r.warn(msg);
  else r.note(msg);
}

function skillDescriptions(dirs) {
  let count = 0;
  let chars = 0;
  for (const d of dirs) {
    for (const s of listDirs(d)) {
      const t = readText(path.join(s, 'SKILL.md'));
      if (t == null) continue;
      count++;
      chars += (frontMatter(t).description ?? '').length + (frontMatter(t).name ?? '').length;
    }
  }
  return { count, tokens: Math.ceil(chars / 4) };
}

function reportSkills(r, dirs, ctx) {
  const { count, tokens } = skillDescriptions(dirs);
  if (count === 0) return;
  const where = dirs.filter(isDir).map((d) => relLabel(d, ctx)).join(', ');
  const msg = `${count} skill(s) installed (${where}); their names and descriptions (~${fmtTok(tokens)} tokens) are in every request.`;
  if (count > 30) r.warn(msg + ' Remove skills you do not use.');
  else r.note(msg);
}

// ---------- per-agent checks ----------

function auditClaudeCode(ctx) {
  const r = new Report('claude-code');
  const { root, home } = ctx;
  const projectFiles = ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md'].map((f) => path.join(root, f)).filter(exists);
  const userFile = path.join(home, '.claude', 'CLAUDE.md');
  const agentsMd = path.join(root, 'AGENTS.md');

  const files = [...projectFiles];
  if (exists(userFile)) files.push(userFile);
  if (projectFiles.length === 0 && exists(agentsMd)) files.push(agentsMd);

  const seen = new Set(files.map((f) => path.resolve(f)));
  for (const f of files) {
    const t = readText(f);
    checkInstructionFile(r, relLabel(f, ctx), t);
    for (const imp of claudeImports(t, path.dirname(f), seen, 0, home)) {
      checkInstructionFile(r, `${relLabel(imp, ctx)} (imported)`, readText(imp));
    }
  }

  const claudeMd = readText(path.join(root, 'CLAUDE.md'));
  const agents = readText(agentsMd);
  if (claudeMd && agents && !/@\.?\/?AGENTS\.md/.test(claudeMd)) {
    const ov = overlap(claudeMd, agents);
    if (ov > 0.4) r.note(`CLAUDE.md repeats ${Math.round(ov * 100)}% of AGENTS.md. Keep one source: put shared rules in AGENTS.md and import it with a line \`@AGENTS.md\` in CLAUDE.md.`);
  }

  for (const dir of [path.join(root, '.claude', 'rules'), path.join(home, '.claude', 'rules')]) {
    const rules = listFiles(dir, (n) => n.endsWith('.md'));
    const unscoped = rules.filter((f) => !frontMatter(readText(f)).paths && !/^---[\s\S]*?\npaths\s*:/m.test(readText(f)));
    for (const f of unscoped) r.load(`${relLabel(f, ctx)} (rule without paths)`, readText(f));
    if (unscoped.length) r.note(`${unscoped.length} rule file(s) in ${relLabel(dir, ctx)} have no \`paths:\` front matter and load in every session. Add \`paths:\` to the ones that only matter for some files.`);
  }

  const settings = [path.join(home, '.claude', 'settings.json'), path.join(root, '.claude', 'settings.json'), path.join(root, '.claude', 'settings.local.json')]
    .map((p) => ({ p, v: readJson(p) }))
    .filter((s) => s.v !== null);
  const merged = { env: {} };
  for (const s of settings) {
    if (s.v === undefined) {
      r.warn(`${relLabel(s.p, ctx)} could not be parsed as JSON.`);
      continue;
    }
    Object.assign(merged, s.v, { env: { ...merged.env, ...(s.v.env ?? {}) } });
  }
  const model = String(merged.model ?? merged.env.ANTHROPIC_MODEL ?? '');
  if (/opus|fable|best/i.test(model) && !/opusplan/i.test(model)) {
    r.note(`Default model is "${model}". Use \`sonnet\` or \`opusplan\` for routine work and switch up only for hard tasks (switch at a task boundary: a model switch re-reads the whole history uncached).`);
  }
  const effort = String(merged.effortLevel ?? merged.env.CLAUDE_CODE_EFFORT_LEVEL ?? '');
  if (/^(xhigh|max|ultracode)$/.test(effort)) r.warn(`effortLevel is "${effort}" by default. Keep high effort for hard tasks and set it per session with /effort.`);
  if (!merged.env.CLAUDE_CODE_SUBAGENT_MODEL) {
    r.note('CLAUDE_CODE_SUBAGENT_MODEL is not set, so subagents without their own `model` run on the main model. If you delegate large searches or log triage, setting it to `haiku` or `sonnet` makes that work cheaper.');
  }
  if (/\[1m\]/i.test(model) && !merged.autoCompactWindow && !merged.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW) {
    r.note('A 1M-context model is the default and no autoCompactWindow is set, so a session can grow to ~1M tokens per request before compacting. Consider `/autocompact 200k` unless you really need the long context.');
  }
  const hooks = merged.hooks && Object.keys(merged.hooks).length;
  if (!hooks) r.note('No hooks configured. A PreToolUse hook that trims test and log output can cut large tool results to a few hundred tokens (see references/levers.md).');

  const claudeJson = readJson(path.join(home, '.claude.json'));
  const projectEntry = claudeJson?.projects?.[root] ?? claudeJson?.projects?.[root.split(path.sep).join('/')];
  reportMcp(
    r,
    [
      { label: '.mcp.json', names: mcpNames(readJson(path.join(root, '.mcp.json')), 'mcpServers') },
      { label: '~/.claude.json (user)', names: mcpNames(claudeJson, 'mcpServers') },
      { label: '~/.claude.json (this project)', names: mcpNames(projectEntry, 'mcpServers') },
    ],
    'Tool definitions are deferred by default, but every server adds instructions and tool names; disable unused ones with /mcp and prefer CLIs such as gh when they exist.'
  );

  reportSkills(r, [path.join(root, '.claude', 'skills'), path.join(home, '.claude', 'skills')], ctx);

  const agentFiles = [path.join(root, '.claude', 'agents'), path.join(home, '.claude', 'agents')].flatMap((d) => listFiles(d, (n) => n.endsWith('.md'), 1));
  const inheriting = agentFiles.filter((f) => {
    const m = frontMatter(readText(f)).model;
    return !m || m === 'inherit';
  });
  if (inheriting.length) {
    r.note(`${inheriting.length} subagent(s) have no model (or \`inherit\`): ${inheriting.map((f) => path.basename(f, '.md')).join(', ')}. Give simple ones \`model: haiku\` and a minimal \`tools:\` list.`);
  }
  return r;
}

function auditCodex(ctx) {
  const r = new Report('codex');
  const { root, home } = ctx;
  const codexHome = ctx.codexHome ?? path.join(home, '.codex');

  const configs = [path.join(codexHome, 'config.toml'), path.join(root, '.codex', 'config.toml')].filter(exists);
  const top = {};
  const tables = {};
  for (const c of configs) {
    const parsed = parseTomlLite(readText(c));
    Object.assign(top, parsed.top);
    Object.assign(tables, parsed.tables);
  }
  const maxBytes = Number(top.project_doc_max_bytes ?? 32768);

  let docBytes = 0;
  const pick = (dir) => [path.join(dir, 'AGENTS.override.md'), path.join(dir, 'AGENTS.md')].find(exists);
  const docs = [pick(codexHome), pick(root)].filter(Boolean);
  for (const f of docs) {
    const t = readText(f);
    docBytes += Buffer.byteLength(t, 'utf8');
    checkInstructionFile(r, relLabel(f, ctx), t);
  }
  if (docBytes > maxBytes) {
    r.warn(`AGENTS.md files total ${docBytes} bytes, over project_doc_max_bytes (${maxBytes}). Codex stops adding instructions at the cap, so the end is silently dropped. Trim, or move directory-specific parts into nested AGENTS.md files.`);
  }

  if (configs.length === 0) r.note('No config.toml found. Defaults apply; see references/levers.md for a lean profile.');
  const effort = String(top.model_reasoning_effort ?? '');
  if (/^(high|xhigh)$/.test(effort)) r.warn(`model_reasoning_effort = "${effort}" for every task. Use "low" or "medium" as the default and raise it per task (/model), or set plan_mode_reasoning_effort for planning only.`);
  if (top.service_tier === 'fast') r.warn('service_tier = "fast" makes every request consume more credits (about 2.5x per the Codex pricing page). Turn it on only when speed matters.');
  if (!top.model_verbosity || top.model_verbosity === 'high') r.note('model_verbosity is not "low". Setting it to "low" shortens answers without changing the work.');
  if (!top.tool_output_token_limit) r.note('tool_output_token_limit is unset. A limit such as 12000 keeps one huge command output from filling the context.');
  if (top.web_search === 'live') r.note('web_search = "live" fetches fresh pages into context. "cached" is cheaper when freshness does not matter.');

  const servers = Object.entries(tables)
    .filter(([name]) => /^mcp_servers\.[^.]+$/.test(name))
    .filter(([, v]) => v.enabled !== false)
    .map(([name]) => name.slice('mcp_servers.'.length));
  reportMcp(r, [{ label: 'config.toml', names: servers }], 'Each server adds context to every session; set `enabled = false` on unused ones or narrow them with `enabled_tools`.');

  reportSkills(r, [path.join(root, '.agents', 'skills'), path.join(home, '.agents', 'skills'), path.join(codexHome, 'skills')], ctx);
  return r;
}

function auditCopilot(ctx) {
  const r = new Report('copilot');
  const { root } = ctx;
  const main = path.join(root, '.github', 'copilot-instructions.md');
  if (exists(main)) checkInstructionFile(r, relLabel(main, ctx), readText(main), { maxLines: 150 });

  const scoped = listFiles(path.join(root, '.github', 'instructions'), (n) => n.endsWith('.instructions.md'));
  const always = scoped.filter((f) => /^["']?\*\*(\/\*)?["']?$/.test(String(frontMatter(readText(f)).applyTo ?? '').trim()));
  for (const f of always) checkInstructionFile(r, `${relLabel(f, ctx)} (applyTo all)`, readText(f), { maxLines: 150 });
  if (always.length) r.note(`${always.length} instruction file(s) use applyTo "**" and apply to every request. Narrow applyTo to the paths they are about.`);
  if (scoped.length > always.length) r.ok(`${scoped.length - always.length} path-scoped instruction file(s) load only for matching files.`);

  for (const f of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].map((n) => path.join(root, n)).filter(exists)) {
    checkInstructionFile(r, `${relLabel(f, ctx)} (agent instructions)`, readText(f));
  }

  reportMcp(r, [{ label: '.vscode/mcp.json', names: mcpNames(readJson(path.join(root, '.vscode', 'mcp.json')), 'servers') }], 'Each enabled tool is offered to the model; deselect unused servers and tools in the chat tool picker.');
  reportSkills(r, [path.join(root, '.github', 'skills'), path.join(root, '.agents', 'skills'), path.join(ctx.home, '.copilot', 'skills')], ctx);
  return r;
}

function auditCursor(ctx) {
  const r = new Report('cursor');
  const { root, home } = ctx;
  const rules = listFiles(path.join(root, '.cursor', 'rules'), (n) => n.endsWith('.mdc'));
  let alwaysLines = 0;
  for (const f of rules) {
    const t = readText(f);
    const fm = frontMatter(t);
    const lines = lineCount(t);
    if (lines > 500) r.warn(`${relLabel(f, ctx)}: ${lines} lines. Cursor recommends under 500 lines per rule; split it into smaller, composable rules.`);
    if (String(fm.alwaysApply) === 'true') {
      r.load(`${relLabel(f, ctx)} (alwaysApply)`, t);
      alwaysLines += lines;
    }
  }
  if (alwaysLines > 150) r.warn(`Always-apply rules total ${alwaysLines} lines and ride along with every request. Switch the task-specific ones to globs or "Apply Intelligently" (description only).`);
  if (rules.length) r.ok(`${rules.length} rule file(s) in .cursor/rules.`);

  const legacy = path.join(root, '.cursorrules');
  if (exists(legacy)) {
    checkInstructionFile(r, '.cursorrules (legacy, always applied)', readText(legacy));
    r.note('.cursorrules is the legacy always-on format. Move its contents into scoped .cursor/rules/*.mdc files.');
  }
  const agentsMd = path.join(root, 'AGENTS.md');
  if (exists(agentsMd)) checkInstructionFile(r, 'AGENTS.md', readText(agentsMd));

  reportMcp(
    r,
    [
      { label: '.cursor/mcp.json', names: mcpNames(readJson(path.join(root, '.cursor', 'mcp.json')), 'mcpServers') },
      { label: '~/.cursor/mcp.json', names: mcpNames(readJson(path.join(home, '.cursor', 'mcp.json')), 'mcpServers') },
    ],
    'Turn off servers you are not using in Cursor Settings > MCP.'
  );
  if (!exists(path.join(root, '.cursorignore')) && !exists(path.join(root, '.gitignore'))) {
    r.note('No .cursorignore or .gitignore. Exclude build output, logs and large data files so they are not indexed or pulled into context.');
  }
  reportSkills(r, [path.join(root, '.agents', 'skills'), path.join(root, '.cursor', 'skills'), path.join(home, '.cursor', 'skills')], ctx);
  return r;
}

function auditOpenCode(ctx) {
  const r = new Report('opencode');
  const { root, home } = ctx;
  const cfgHome = ctx.xdgConfig ?? path.join(home, '.config');
  const cfgFiles = [
    path.join(cfgHome, 'opencode', 'opencode.json'),
    path.join(cfgHome, 'opencode', 'opencode.jsonc'),
    path.join(root, 'opencode.json'),
    path.join(root, 'opencode.jsonc'),
  ].filter(exists);
  const cfg = {};
  for (const f of cfgFiles) {
    const v = readJson(f);
    if (v === undefined) r.warn(`${relLabel(f, ctx)} could not be parsed.`);
    else Object.assign(cfg, v, { mcp: { ...(cfg.mcp ?? {}), ...(v.mcp ?? {}) } });
  }

  for (const f of [path.join(cfgHome, 'opencode', 'AGENTS.md'), path.join(root, 'AGENTS.md')].filter(exists)) {
    checkInstructionFile(r, relLabel(f, ctx), readText(f));
  }
  if (!exists(path.join(root, 'AGENTS.md')) && exists(path.join(root, 'CLAUDE.md'))) {
    checkInstructionFile(r, 'CLAUDE.md (fallback)', readText(path.join(root, 'CLAUDE.md')));
  }
  for (const inst of Array.isArray(cfg.instructions) ? cfg.instructions : []) {
    if (/[*?]/.test(inst)) {
      r.note(`instructions entry "${inst}" is a glob; every match is loaded into each session.`);
      continue;
    }
    const p = path.resolve(root, inst.replace(/^~\//, home + '/'));
    const t = readText(p);
    if (t != null) checkInstructionFile(r, `${inst} (instructions)`, t);
  }

  if (cfgFiles.length === 0) r.note('No opencode.json found. See references/levers.md for a lean config.');
  else {
    if (!cfg.small_model) r.note('small_model is not set. Point it at a cheap model so titles and other light tasks do not use the main model.');
    if (cfg.compaction?.prune !== true) r.note('compaction.prune is not true. Enabling it drops old tool outputs from the history to save tokens.');
  }
  reportMcp(r, [{ label: 'opencode.json', names: mcpNames(cfg, 'mcp') }], 'Set `"enabled": false` on servers you do not need, or disable their tools per agent.');
  reportSkills(r, [path.join(root, '.opencode', 'skills'), path.join(root, '.agents', 'skills'), path.join(cfgHome, 'opencode', 'skills')], ctx);
  return r;
}

const AUDITS = {
  'claude-code': auditClaudeCode,
  codex: auditCodex,
  copilot: auditCopilot,
  cursor: auditCursor,
  opencode: auditOpenCode,
};

export function detectAgents(ctx) {
  const { root, home } = ctx;
  const has = (...ps) => ps.some(exists);
  const found = [];
  if (has(path.join(root, 'CLAUDE.md'), path.join(root, '.claude'), path.join(home, '.claude'))) found.push('claude-code');
  if (has(path.join(root, '.codex'), ctx.codexHome ?? path.join(home, '.codex'))) found.push('codex');
  if (has(path.join(root, '.github', 'copilot-instructions.md'), path.join(root, '.github', 'instructions'), path.join(root, '.vscode', 'mcp.json'))) found.push('copilot');
  if (has(path.join(root, '.cursor'), path.join(root, '.cursorrules'), path.join(home, '.cursor'))) found.push('cursor');
  if (has(path.join(root, 'opencode.json'), path.join(root, 'opencode.jsonc'), path.join(root, '.opencode'), path.join(ctx.xdgConfig ?? path.join(home, '.config'), 'opencode'))) found.push('opencode');
  return found;
}

export function audit({ root = process.cwd(), home = os.homedir(), agents = 'auto', codexHome, xdgConfig } = {}) {
  const ctx = { root: path.resolve(root), home: path.resolve(home), codexHome, xdgConfig };
  let list;
  if (agents === 'auto') list = detectAgents(ctx);
  else if (agents === 'all') list = AGENTS;
  else list = String(agents).split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = list.filter((a) => !AUDITS[a]);
  if (unknown.length) throw new Error(`Unknown agent(s): ${unknown.join(', ')}. Known: ${AGENTS.join(', ')}`);
  return { root: ctx.root, reports: list.map((a) => AUDITS[a](ctx)) };
}

function render({ root, reports }) {
  const out = [`token-saver audit - root: ${root}`];
  if (reports.length === 0) out.push('No agent configuration found. Pass --agent <name> to check one anyway.');
  let warns = 0;
  let notes = 0;
  for (const r of reports) {
    out.push('', `== ${r.agent} ==`);
    if (r.alwaysLoaded.length) {
      const parts = r.alwaysLoaded.map((e) => `${e.label} ${e.lines}L`).join(', ');
      out.push(`Always-loaded instructions: ~${fmtTok(r.alwaysTokens)} tokens (${parts})`);
    } else out.push('Always-loaded instructions: none found');
    for (const f of r.findings) {
      const tag = { warn: 'WARN', note: 'NOTE', ok: 'OK  ' }[f.level];
      out.push(`${tag} ${f.msg}`);
      if (f.level === 'warn') warns++;
      if (f.level === 'note') notes++;
    }
  }
  out.push('', `Summary: ${warns} warning(s), ${notes} note(s). Token counts are rough estimates.`);
  return out.join('\n');
}

function parseArgs(argv) {
  const opts = { agents: 'auto', json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--agent' || a === '-a') opts.agents = argv[++i];
    else if (a === '--root') opts.root = argv[++i];
    else if (a === '--home') opts.home = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (opts.help) {
    console.log('Usage: node audit.mjs [--agent <name[,name]>|all|auto] [--root <dir>] [--home <dir>] [--json]\nAgents: ' + AGENTS.join(', '));
    return;
  }
  try {
    const result = audit(opts);
    if (opts.json) {
      console.log(JSON.stringify({ root: result.root, reports: result.reports.map((r) => ({ agent: r.agent, alwaysLoadedTokens: r.alwaysTokens, alwaysLoaded: r.alwaysLoaded, findings: r.findings })) }, null, 2));
    } else console.log(render(result));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

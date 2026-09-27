// Tests for shared/audit.mjs. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { audit, claudeImports, estimateTokens, frontMatter, overlap, parseTomlLite, stripJsonc } from '../shared/audit.mjs';

function fixture(files) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'token-saver-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(base, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return { root: path.join(base, 'repo'), home: path.join(base, 'home'), cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

const lines = (n, text = 'Use pnpm for every install command in this repository') => Array.from({ length: n }, (_, i) => `${text} ${i}`).join('\n') + '\n';
const msgs = (report) => report.findings.map((f) => `${f.level}: ${f.msg}`).join('\n');

test('estimateTokens counts ASCII at ~4 chars per token and non-ASCII at ~1', () => {
  assert.equal(estimateTokens('abcdefgh'), 2);
  assert.equal(estimateTokens('日本語'), 3);
});

test('stripJsonc removes comments and trailing commas but keeps strings intact', () => {
  const src = '{\n  // note\n  "url": "https://example.com/a//b", /* x */\n  "list": [1, 2,],\n}';
  assert.deepEqual(JSON.parse(stripJsonc(src)), { url: 'https://example.com/a//b', list: [1, 2] });
});

test('parseTomlLite reads top-level keys and table flags', () => {
  const { top, tables } = parseTomlLite('model_reasoning_effort = "high" # comment\ntool_output_token_limit = 12000\n\n[mcp_servers.docs]\nenabled = false\n');
  assert.equal(top.model_reasoning_effort, 'high');
  assert.equal(top.tool_output_token_limit, 12000);
  assert.equal(tables['mcp_servers.docs'].enabled, false);
});

test('frontMatter and overlap helpers', () => {
  assert.deepEqual(frontMatter('---\nalwaysApply: true\nglobs: src/**\n---\nbody'), { alwaysApply: 'true', globs: 'src/**' });
  assert.equal(overlap('alpha line one\nbeta line two\n', 'alpha line one\ngamma line three\n'), 0.5);
});

test('claudeImports follows @imports outside code and ignores code spans', () => {
  const fx = fixture({ 'repo/docs/a.md': 'A', 'repo/docs/b.md': 'B' });
  try {
    const found = claudeImports('See @docs/a.md and `@docs/b.md`\n', fx.root, new Set(), 0, fx.home);
    assert.deepEqual(found.map((p) => path.basename(p)), ['a.md']);
  } finally {
    fx.cleanup();
  }
});

test('claude-code: long CLAUDE.md, flagship default, inheriting subagent, MCP servers', () => {
  const fx = fixture({
    'repo/CLAUDE.md': lines(230),
    'repo/.claude/settings.json': JSON.stringify({ model: 'opus', effortLevel: 'max' }),
    'repo/.claude/agents/scout.md': '---\nname: scout\ndescription: x\n---\nbody',
    'repo/.mcp.json': JSON.stringify({ mcpServers: { a: {}, b: {} } }),
    'home/.claude/CLAUDE.md': 'short\n',
  });
  try {
    const [r] = audit({ root: fx.root, home: fx.home, agents: 'claude-code' }).reports;
    const text = msgs(r);
    assert.match(text, /warn: CLAUDE\.md: 230 lines/);
    assert.match(text, /Default model is "opus"/);
    assert.match(text, /warn: effortLevel is "max"/);
    assert.match(text, /subagent\(s\) have no model.*scout/);
    assert.match(text, /2 MCP server\(s\)/);
    assert.equal(r.alwaysLoaded.length, 2);
  } finally {
    fx.cleanup();
  }
});

test('claude-code: AGENTS.md is used when there is no CLAUDE.md; unscoped rules count as always loaded', () => {
  const fx = fixture({
    'repo/AGENTS.md': lines(10),
    'repo/.claude/rules/api.md': '---\npaths:\n  - "src/api/**"\n---\nscoped',
    'repo/.claude/rules/style.md': 'always on',
    'home/.keep': '',
  });
  try {
    const [r] = audit({ root: fx.root, home: fx.home, agents: 'claude-code' }).reports;
    const labels = r.alwaysLoaded.map((e) => e.label);
    assert.ok(labels.includes('AGENTS.md'));
    assert.ok(labels.some((l) => l.includes('style.md')));
    assert.ok(!labels.some((l) => l.includes('api.md')));
  } finally {
    fx.cleanup();
  }
});

test('codex: AGENTS.md over project_doc_max_bytes, high effort, fast tier, enabled MCP servers', () => {
  const fx = fixture({
    'repo/AGENTS.md': lines(40),
    'home/.codex/config.toml': 'model_reasoning_effort = "xhigh"\nservice_tier = "fast"\nproject_doc_max_bytes = 1000\n[mcp_servers.one]\ncommand = "x"\n[mcp_servers.two]\nenabled = false\n',
  });
  try {
    const [r] = audit({ root: fx.root, home: fx.home, agents: 'codex' }).reports;
    const text = msgs(r);
    assert.match(text, /warn: AGENTS\.md files total \d+ bytes, over project_doc_max_bytes \(1000\)/);
    assert.match(text, /warn: model_reasoning_effort = "xhigh"/);
    assert.match(text, /warn: service_tier = "fast"/);
    assert.match(text, /1 MCP server\(s\) enabled \(config\.toml: one\)/);
  } finally {
    fx.cleanup();
  }
});

test('copilot: applyTo "**" counts as always loaded, scoped files do not', () => {
  const fx = fixture({
    'repo/.github/copilot-instructions.md': lines(5),
    'repo/.github/instructions/all.instructions.md': '---\napplyTo: "**"\n---\nx',
    'repo/.github/instructions/api.instructions.md': '---\napplyTo: "src/api/**"\n---\ny',
    'home/.keep': '',
  });
  try {
    const [r] = audit({ root: fx.root, home: fx.home, agents: 'copilot' }).reports;
    assert.match(msgs(r), /1 instruction file\(s\) use applyTo "\*\*"/);
    assert.match(msgs(r), /ok: 1 path-scoped instruction file/);
    assert.equal(r.alwaysLoaded.length, 2);
  } finally {
    fx.cleanup();
  }
});

test('cursor: always-apply budget, oversized rule, legacy .cursorrules', () => {
  const fx = fixture({
    'repo/.cursor/rules/big.mdc': '---\nalwaysApply: true\n---\n' + lines(520),
    'repo/.cursor/rules/scoped.mdc': '---\nalwaysApply: false\nglobs: src/**\n---\nx',
    'repo/.cursorrules': 'legacy\n',
    'repo/.gitignore': 'dist\n',
    'home/.keep': '',
  });
  try {
    const [r] = audit({ root: fx.root, home: fx.home, agents: 'cursor' }).reports;
    const text = msgs(r);
    assert.match(text, /warn: \.cursor\/rules\/big\.mdc: 523 lines/);
    assert.match(text, /warn: Always-apply rules total 523 lines/);
    assert.match(text, /legacy always-on format/);
  } finally {
    fx.cleanup();
  }
});

test('opencode: suggests small_model and compaction.prune; parses JSONC; skips disabled MCP', () => {
  const fx = fixture({
    'repo/opencode.jsonc': '{\n  // comment\n  "model": "x/y",\n  "mcp": { "a": { "enabled": false }, "b": {} },\n}',
    'home/.keep': '',
  });
  try {
    const [r] = audit({ root: fx.root, home: fx.home, agents: 'opencode', xdgConfig: path.join(fx.home, '.config') }).reports;
    const text = msgs(r);
    assert.match(text, /small_model is not set/);
    assert.match(text, /compaction\.prune is not true/);
    assert.match(text, /1 MCP server\(s\) enabled \(opencode\.json: b\)/);
  } finally {
    fx.cleanup();
  }
});

test('auto detection finds only configured agents; unknown agent throws', () => {
  const fx = fixture({ 'repo/.cursor/rules/a.mdc': 'x', 'home/.keep': '' });
  try {
    const { reports } = audit({ root: fx.root, home: fx.home, xdgConfig: path.join(fx.home, '.config') });
    assert.deepEqual(reports.map((r) => r.agent), ['cursor']);
    assert.throws(() => audit({ root: fx.root, home: fx.home, agents: 'nope' }), /Unknown agent/);
  } finally {
    fx.cleanup();
  }
});

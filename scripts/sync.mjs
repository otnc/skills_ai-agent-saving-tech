#!/usr/bin/env node
// Copies the shared sources in shared/ into every skill under skills/, so each skill works on its own when installed alone.
//   shared/core-rules.md -> injected between the core-rules markers in skills/*/SKILL.md
//   shared/always-on.md  -> skills/*/assets/always-on.md
//   shared/budget.md     -> skills/*/references/budget.md
//   shared/audit.mjs     -> skills/*/scripts/audit.mjs
// Usage: node scripts/sync.mjs [--check]   (--check exits 1 if anything is out of date, without writing)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shared = path.join(repo, 'shared');
const skillsDir = path.join(repo, 'skills');
const check = process.argv.includes('--check');

const START = /<!-- core-rules:start[^>]*-->/;
const END = '<!-- core-rules:end -->';

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const coreRules = read(path.join(shared, 'core-rules.md')).trim();
const copies = [
  ['always-on.md', 'assets/always-on.md'],
  ['budget.md', 'references/budget.md'],
  ['audit.mjs', 'scripts/audit.mjs'],
];

const stale = [];

function put(target, content) {
  const current = fs.existsSync(target) ? read(target) : null;
  if (current === content) return;
  stale.push(path.relative(repo, target));
  if (check) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

const skills = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
  .map((e) => e.name);

for (const name of skills) {
  const dir = path.join(skillsDir, name);
  const skillMd = path.join(dir, 'SKILL.md');
  const text = read(skillMd);
  const start = text.match(START);
  const endIdx = text.indexOf(END);
  if (!start || endIdx < start.index) {
    console.error(`${path.relative(repo, skillMd)}: missing core-rules markers`);
    process.exit(1);
  }
  const head = text.slice(0, start.index + start[0].length);
  const tail = text.slice(endIdx);
  put(skillMd, `${head}\n${coreRules}\n${tail}`);
  for (const [from, to] of copies) put(path.join(dir, to), read(path.join(shared, from)));
}

if (stale.length === 0) console.log(`All ${skills.length} skills are in sync.`);
else if (check) {
  console.error(`Out of sync (run node scripts/sync.mjs):\n  ${stale.join('\n  ')}`);
  process.exit(1);
} else console.log(`Updated:\n  ${stale.join('\n  ')}`);

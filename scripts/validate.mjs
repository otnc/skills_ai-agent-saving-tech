#!/usr/bin/env node
// Validates every skills/*/SKILL.md against the Agent Skills specification (https://agentskills.io/specification) and this repo's own limits.
// Usage: node scripts/validate.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(repo, 'skills');
const errors = [];
const info = [];

// Frontmatter subset used here: flat keys plus one level of nested `metadata:` keys.
function parseFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const obj = {};
  let parent = null;
  for (const line of m[1].split('\n')) {
    const nested = line.match(/^ {2}([A-Za-z0-9_-]+):\s*(.*)$/);
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    const unquote = (v) => v.trim().replace(/^"(.*)"$/, '$1');
    if (nested && parent) obj[parent][nested[1]] = unquote(nested[2]);
    else if (top) {
      if (top[2].trim() === '') {
        parent = top[1];
        obj[parent] = {};
      } else {
        parent = null;
        obj[top[1]] = unquote(top[2]);
      }
    }
  }
  return { obj, bodyStart: m[0].length };
}

const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
for (const { name: dirName } of skills) {
  const rel = `skills/${dirName}/SKILL.md`;
  const file = path.join(skillsDir, dirName, 'SKILL.md');
  if (!fs.existsSync(file)) {
    errors.push(`${rel}: missing`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const fm = parseFrontMatter(text);
  if (!fm) {
    errors.push(`${rel}: no YAML front matter`);
    continue;
  }
  const { name, description, compatibility, metadata } = fm.obj;
  if (!name) errors.push(`${rel}: name is required`);
  else {
    if (name.length > 64) errors.push(`${rel}: name longer than 64 characters`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push(`${rel}: name must be lowercase letters, digits and single hyphens`);
    if (name !== dirName) errors.push(`${rel}: name "${name}" must match directory "${dirName}"`);
  }
  if (!description) errors.push(`${rel}: description is required`);
  else if (description.length > 1024) errors.push(`${rel}: description is ${description.length} characters (max 1024)`);
  if (compatibility && compatibility.length > 500) errors.push(`${rel}: compatibility longer than 500 characters`);
  if (metadata && typeof metadata !== 'object') errors.push(`${rel}: metadata must be a mapping`);

  const body = text.slice(fm.bodyStart);
  const lines = text.split('\n').length;
  if (lines > 500) errors.push(`${rel}: ${lines} lines (keep SKILL.md under 500)`);
  const approxTokens = Math.ceil(body.length / 4);
  if (approxTokens > 5000) errors.push(`${rel}: body is ~${approxTokens} tokens (recommended under 5000)`);

  for (const m of body.matchAll(/\]\(([^)#\s]+)\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target)) continue;
    if (!fs.existsSync(path.join(skillsDir, dirName, target))) errors.push(`${rel}: broken link ${target}`);
  }
  info.push(`${dirName}: ${lines} lines, body ~${approxTokens} tokens, description ${description?.length ?? 0} chars`);
}

console.log(info.join('\n'));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nAll ${skills.length} skills are valid.`);

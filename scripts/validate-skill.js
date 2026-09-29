#!/usr/bin/env node
'use strict';
// Validate skills/*/SKILL.md against the Agent Skills specification (agentskills.io)
// and check that every file referenced from SKILL.md exists.

const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const root = path.join(__dirname, '..', 'skills');
let errors = 0;
const err = (skill, msg) => {
  errors++;
  console.error(`✗ ${skill}: ${msg}`);
};

for (const dir of fs.readdirSync(root)) {
  const skillDir = path.join(root, dir);
  const file = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(file)) {
    err(dir, 'missing SKILL.md');
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    err(dir, 'missing YAML frontmatter');
    continue;
  }
  const [, fm, body] = m;
  const topKeys = [...fm.matchAll(/^([A-Za-z-]+):/gm)].map((x) => x[1]);
  for (const k of topKeys) if (!ALLOWED_KEYS.has(k)) err(dir, `frontmatter key not in the spec: ${k}`);

  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1];
  if (!name) err(dir, 'missing name');
  else {
    if (name !== dir) err(dir, `name "${name}" must match folder name "${dir}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) err(dir, 'name must be lowercase-hyphenated, ≤ 64 chars');
  }
  const description = (fm.match(/^description:\s*(.+)$/m) || [])[1];
  if (!description) err(dir, 'missing description');
  else if (description.length > 1024) err(dir, `description is ${description.length} chars (max 1024)`);

  const lines = body.split('\n').length;
  if (lines > 500) err(dir, `SKILL.md body is ${lines} lines (keep it under 500; move detail to references/)`);

  for (const ref of new Set([...body.matchAll(/`((?:references|assets|scripts)\/[^`*\s]+)`/g)].map((x) => x[1]))) {
    if (!fs.existsSync(path.join(skillDir, ref))) err(dir, `referenced file does not exist: ${ref}`);
  }
  if (!errors) console.log(`✓ ${dir}: SKILL.md valid (${description.length}-char description, ${lines}-line body)`);
}
process.exit(errors ? 1 : 0);

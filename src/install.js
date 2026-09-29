'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SKILL_NAME = 'learn';
const SKILL_SOURCE = path.join(__dirname, '..', 'skills', SKILL_NAME);

/** Read `name` and `metadata.version` from a SKILL.md frontmatter (no YAML dependency). */
function readSkillMeta(skillDir) {
  const file = path.join(skillDir, 'SKILL.md');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const name = (fm.match(/^name:\s*["']?([^"'\r\n]+)["']?\s*$/m) || [])[1];
  const version = (fm.match(/^\s+version:\s*["']?([^"'\r\n]+)["']?\s*$/m) || [])[1];
  return { name: name && name.trim(), version: version && version.trim() };
}

/**
 * Install the skill into `<skillsDir>/learn`.
 * Returns { status: 'installed' | 'updated' | 'skipped', dest, reason? }.
 * An existing folder that is not this skill is never touched unless `force`.
 */
function installTo(skillsDir, { force = false, dryRun = false, source = SKILL_SOURCE } = {}) {
  const dest = path.join(skillsDir, SKILL_NAME);
  let status = 'installed';

  if (fs.existsSync(dest)) {
    const meta = readSkillMeta(dest);
    if ((!meta || meta.name !== SKILL_NAME) && !force) {
      return { status: 'skipped', dest, reason: 'a different skill named "learn" already exists (use --force to replace it)' };
    }
    status = 'updated';
    if (!dryRun) fs.rmSync(dest, { recursive: true, force: true });
  }

  if (!dryRun) {
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.cpSync(source, dest, { recursive: true });
    // Keep helper scripts executable (npm tarballs may drop the bit on some platforms).
    for (const f of walk(dest)) if (f.endsWith('.sh')) fs.chmodSync(f, 0o755);
  }
  return { status, dest };
}

function uninstallFrom(skillsDir, { force = false, dryRun = false } = {}) {
  const dest = path.join(skillsDir, SKILL_NAME);
  if (!fs.existsSync(dest)) return { status: 'absent', dest };
  const meta = readSkillMeta(dest);
  if ((!meta || meta.name !== SKILL_NAME) && !force) {
    return { status: 'skipped', dest, reason: 'folder does not look like this skill (use --force)' };
  }
  if (!dryRun) fs.rmSync(dest, { recursive: true, force: true });
  return { status: 'removed', dest };
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

module.exports = { SKILL_NAME, SKILL_SOURCE, installTo, uninstallFrom, readSkillMeta };

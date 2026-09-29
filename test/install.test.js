'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { installTo, uninstallFrom, readSkillMeta, SKILL_SOURCE } = require('../src/install');
const { tmpdir, write } = require('./helpers');

test('installs the whole skill folder', () => {
  const dir = tmpdir();
  const r = installTo(dir);
  assert.equal(r.status, 'installed');
  assert.equal(readSkillMeta(r.dest).name, 'learn');
  for (const f of ['references/exercises.md', 'assets/templates/check.sh']) {
    assert.ok(fs.existsSync(path.join(r.dest, f)), f);
  }
  if (process.platform !== 'win32') {
    assert.ok(fs.statSync(path.join(r.dest, 'assets/templates/check.sh')).mode & 0o100, 'check.sh is executable');
  }
});

test('updates an existing install and removes stale files', () => {
  const dir = tmpdir();
  installTo(dir);
  write(path.join(dir, 'learn', 'stale.md'), 'old');
  const r = installTo(dir);
  assert.equal(r.status, 'updated');
  assert.equal(fs.existsSync(path.join(dir, 'learn', 'stale.md')), false);
});

test('never overwrites a different skill named learn unless forced', () => {
  const dir = tmpdir();
  write(path.join(dir, 'learn', 'SKILL.md'), '---\nname: something-else\ndescription: x\n---\n');
  assert.equal(installTo(dir).status, 'skipped');
  assert.equal(readSkillMeta(path.join(dir, 'learn')).name, 'something-else');
  assert.equal(installTo(dir, { force: true }).status, 'updated');
  assert.equal(readSkillMeta(path.join(dir, 'learn')).name, 'learn');
});

test('dry run writes nothing', () => {
  const dir = tmpdir();
  assert.equal(installTo(dir, { dryRun: true }).status, 'installed');
  assert.equal(fs.existsSync(path.join(dir, 'learn')), false);
});

test('uninstall removes only this skill', () => {
  const dir = tmpdir();
  assert.equal(uninstallFrom(dir).status, 'absent');
  installTo(dir);
  assert.equal(uninstallFrom(dir).status, 'removed');
  write(path.join(dir, 'learn', 'SKILL.md'), '---\nname: other\n---\n');
  assert.equal(uninstallFrom(dir).status, 'skipped');
});

test('reads version from the bundled SKILL.md', () => {
  const pkg = require('../package.json');
  assert.equal(readSkillMeta(SKILL_SOURCE).version, pkg.version, 'SKILL.md metadata.version must match package.json');
});

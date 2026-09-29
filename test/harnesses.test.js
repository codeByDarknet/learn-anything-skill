'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detectHarnesses, targetDir } = require('../src/harnesses');
const { tmpdir, write } = require('./helpers');

const byId = (list) => Object.fromEntries(list.map((h) => [h.id, h]));

test('detects harnesses from their config directories', () => {
  const home = tmpdir();
  fs.mkdirSync(path.join(home, '.claude'));
  fs.mkdirSync(path.join(home, '.gemini', 'antigravity'), { recursive: true });
  const h = byId(detectHarnesses({ home, env: { PATH: '' } }));
  assert.equal(h['claude-code'].detected, true);
  assert.equal(h.antigravity.detected, true);
  // ~/.gemini alone (created by Antigravity) must not imply Gemini CLI
  assert.equal(h['gemini-cli'].detected, false);
  assert.equal(h.codex.detected, false);
});

test('detects Gemini CLI from its settings file', () => {
  const home = tmpdir();
  write(path.join(home, '.gemini', 'settings.json'), '{}');
  assert.equal(byId(detectHarnesses({ home, env: { PATH: '' } }))['gemini-cli'].detected, true);
});

test('detects harnesses from binaries on PATH', { skip: process.platform === 'win32' }, () => {
  const home = tmpdir();
  const bin = tmpdir();
  write(path.join(bin, 'codex'), '#!/bin/sh\n');
  fs.chmodSync(path.join(bin, 'codex'), 0o755);
  const h = byId(detectHarnesses({ home, env: { PATH: bin } }));
  assert.equal(h.codex.detected, true);
  assert.match(h.codex.evidence[0], /codex \(PATH\)/);
});

test('honours CLAUDE_CONFIG_DIR, CODEX_HOME and XDG_CONFIG_HOME', () => {
  const home = tmpdir();
  const env = { PATH: '', CLAUDE_CONFIG_DIR: '/c/claude', CODEX_HOME: '/c/codex', XDG_CONFIG_HOME: '/c/xdg' };
  const h = byId(detectHarnesses({ home, env }));
  assert.equal(h['claude-code'].global, path.join('/c/claude', 'skills'));
  assert.equal(h.codex.global, path.join('/c/codex', 'skills'));
  assert.equal(h.opencode.global, path.join('/c/xdg', 'opencode', 'skills'));
});

test('targetDir resolves project scope against cwd', () => {
  const [claude] = detectHarnesses({ home: tmpdir(), env: { PATH: '' } });
  assert.equal(targetDir(claude, 'project', '/work/app'), path.resolve('/work/app', '.claude/skills'));
  assert.equal(targetDir(claude, 'global'), claude.global);
});

test('every harness has unique id and complete definition', () => {
  const list = detectHarnesses({ home: tmpdir(), env: { PATH: '' } });
  assert.equal(new Set(list.map((h) => h.id)).size, list.length);
  for (const h of list) {
    assert.ok(h.name && h.global && h.project && h.usage, h.id);
    assert.ok(path.isAbsolute(h.global), h.id);
    assert.ok(!path.isAbsolute(h.project), h.id);
  }
});

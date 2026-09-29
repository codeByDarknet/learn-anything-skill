'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('./helpers');

const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
const run = (args, env = {}) =>
  spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  });

test('--help and --version', () => {
  assert.match(run(['--help']).stdout, /npx learn-anything-skill/);
  assert.equal(run(['--version']).stdout.trim(), require('../package.json').version);
});

test('installs into a custom directory without prompts', () => {
  const dir = tmpdir();
  const r = run(['--dir', dir, '-y']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, 'learn', 'SKILL.md')));
});

test('installs for explicit agents in a fake home', () => {
  const home = tmpdir();
  const env = { HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: '', CODEX_HOME: '', XDG_CONFIG_HOME: '' };
  const r = run(['--agent', 'claude-code,codex', '-y'], env);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(home, '.claude', 'skills', 'learn', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.codex', 'skills', 'learn', 'SKILL.md')));
  const u = run(['uninstall', '--agent', 'claude-code', '-y'], env);
  assert.equal(u.status, 0, u.stderr);
  assert.equal(fs.existsSync(path.join(home, '.claude', 'skills', 'learn')), false);
  assert.ok(fs.existsSync(path.join(home, '.codex', 'skills', 'learn')));
});

test('project scope writes relative to cwd and dedupes shared dirs', () => {
  const cwd = tmpdir();
  const r = spawnSync(process.execPath, [CLI, '--project', '--agent', 'codex,amp,agents', '-y'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'learn', 'SKILL.md')));
  assert.equal((r.stdout.match(/installed/g) || []).length, 1, 'one write for three harnesses sharing .agents/skills');
});

test('rejects unknown arguments and harness ids', () => {
  assert.equal(run(['--nope']).status, 1);
  const r = run(['--agent', 'bogus', '-y']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Unknown harness/);
});

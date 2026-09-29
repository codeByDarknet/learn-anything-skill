'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * Agent harnesses that load Agent Skills (a folder with a SKILL.md).
 *
 * - global:  user-level skills directory (skill available in every project)
 * - project: project-level directory, relative to the current working directory
 * - detect:  config dirs and/or binaries whose presence means the harness is installed
 *
 * Paths follow each tool's documentation; env overrides (CLAUDE_CONFIG_DIR, CODEX_HOME,
 * XDG_CONFIG_HOME) are honoured. Found a wrong or missing path? PRs welcome.
 */
function harnessDefinitions(ctx) {
  const { home, env } = ctx;
  const xdg = env.XDG_CONFIG_HOME || path.join(home, '.config');
  const claudeDir = env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const codexDir = env.CODEX_HOME || path.join(home, '.codex');
  const gemini = path.join(home, '.gemini');

  return [
    {
      id: 'claude-code',
      name: 'Claude Code',
      global: path.join(claudeDir, 'skills'),
      project: '.claude/skills',
      detect: { dirs: [claudeDir], bins: ['claude'] },
      usage: '/learn go',
    },
    {
      id: 'codex',
      name: 'OpenAI Codex',
      global: path.join(codexDir, 'skills'),
      project: '.agents/skills',
      detect: { dirs: [codexDir], bins: ['codex'] },
      usage: '$learn go  (or /skills)',
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      global: path.join(xdg, 'opencode', 'skills'),
      project: '.opencode/skills',
      detect: { dirs: [path.join(xdg, 'opencode'), path.join(home, '.opencode')], bins: ['opencode'] },
      usage: '"use the learn skill for go"',
    },
    {
      id: 'gemini-cli',
      name: 'Gemini CLI',
      global: path.join(gemini, 'skills'),
      project: '.gemini/skills',
      detect: { files: [path.join(gemini, 'settings.json')], bins: ['gemini'] },
      usage: '/learn go',
    },
    {
      id: 'antigravity',
      name: 'Google Antigravity',
      global: path.join(gemini, 'antigravity', 'skills'),
      project: '.agent/skills',
      detect: { dirs: [path.join(gemini, 'antigravity')], bins: ['antigravity'] },
      usage: '/learn go',
    },
    {
      id: 'cursor',
      name: 'Cursor',
      global: path.join(home, '.cursor', 'skills'),
      project: '.cursor/skills',
      detect: { dirs: [path.join(home, '.cursor')], bins: ['cursor', 'cursor-agent'] },
      usage: '/learn go',
    },
    {
      id: 'windsurf',
      name: 'Windsurf',
      global: path.join(home, '.codeium', 'windsurf', 'skills'),
      project: '.windsurf/skills',
      detect: { dirs: [path.join(home, '.codeium', 'windsurf')], bins: ['windsurf'] },
      usage: '@learn go',
    },
    {
      id: 'github-copilot',
      name: 'GitHub Copilot',
      global: path.join(home, '.copilot', 'skills'),
      project: '.github/skills',
      detect: { dirs: [path.join(home, '.copilot')], bins: ['copilot'] },
      usage: '/learn go',
    },
    {
      id: 'kiro',
      name: 'Kiro',
      global: path.join(home, '.kiro', 'skills'),
      project: '.kiro/skills',
      detect: { dirs: [path.join(home, '.kiro')], bins: ['kiro', 'kiro-cli'] },
      usage: '/learn go',
    },
    {
      id: 'goose',
      name: 'Goose',
      global: path.join(xdg, 'goose', 'skills'),
      project: '.goose/skills',
      detect: { dirs: [path.join(xdg, 'goose')], bins: ['goose'] },
      usage: '"use the learn skill for go"',
    },
    {
      id: 'amp',
      name: 'Amp',
      global: path.join(xdg, 'agents', 'skills'),
      project: '.agents/skills',
      detect: { dirs: [path.join(xdg, 'amp')], bins: ['amp'] },
      usage: '"use the learn skill for go"',
    },
    {
      id: 'roo',
      name: 'Roo Code',
      global: path.join(home, '.roo', 'skills'),
      project: '.roo/skills',
      detect: { dirs: [path.join(home, '.roo')], bins: [] },
      usage: '"use the learn skill for go"',
    },
    {
      id: 'agents',
      name: 'Universal (.agents/skills)',
      global: path.join(home, '.agents', 'skills'),
      project: '.agents/skills',
      detect: { dirs: [path.join(home, '.agents')], bins: [] },
      usage: 'read by several agents that follow the shared .agents convention',
    },
  ];
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/** Minimal cross-platform `which`. */
function onPath(bin, env) {
  const dirs = (env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  const exts = process.platform === 'win32' ? (env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';') : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, bin + ext.toLowerCase());
      const candidateUpper = path.join(dir, bin + ext);
      if (exists(candidate) || exists(candidateUpper)) return true;
    }
  }
  return false;
}

/**
 * Returns every harness with `detected` and `evidence` fields.
 * ctx = { home, env, cwd } — injectable for tests.
 */
function detectHarnesses(ctx = {}) {
  const full = {
    home: ctx.home || os.homedir(),
    env: ctx.env || process.env,
    cwd: ctx.cwd || process.cwd(),
  };
  return harnessDefinitions(full).map((h) => {
    const evidence = [];
    for (const d of h.detect.dirs || []) if (exists(d)) evidence.push(d);
    for (const f of h.detect.files || []) if (exists(f)) evidence.push(f);
    for (const b of h.detect.bins || []) if (onPath(b, full.env)) evidence.push(`${b} (PATH)`);
    return { ...h, detected: evidence.length > 0, evidence };
  });
}

/** Resolve the skills directory for a harness and scope ('global' | 'project'). */
function targetDir(harness, scope, cwd = process.cwd()) {
  return scope === 'project' ? path.resolve(cwd, harness.project) : harness.global;
}

module.exports = { detectHarnesses, harnessDefinitions, targetDir, onPath };

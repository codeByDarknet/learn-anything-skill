#!/usr/bin/env node
'use strict';

const path = require('node:path');
const os = require('node:os');
const { detectHarnesses, targetDir } = require('../src/harnesses');
const { installTo, uninstallFrom, readSkillMeta, SKILL_SOURCE } = require('../src/install');
const { c, select, confirm, isInteractive } = require('../src/ui');

const pkg = require('../package.json');

const HELP = `
${c.bold('learn-anything-skill')} ${c.dim('v' + pkg.version)}
Install the ${c.cyan('learn')} skill: generate hands-on, auto-graded courses for any technology.

${c.bold('Usage')}
  npx learn-anything-skill [command] [options]

${c.bold('Commands')}
  install        Detect your agent harnesses and install the skill (default)
  uninstall      Remove the skill from harnesses
  list           Show detected harnesses and where the skill is installed

${c.bold('Options')}
  -a, --agent <ids>   Comma-separated harness ids (e.g. claude-code,codex). Skips detection.
      --all           Every supported harness, detected or not
  -p, --project       Install into the current project instead of globally
  -g, --global        Install globally (default)
      --dir <path>    Install into a custom skills directory (repeatable)
  -y, --yes           No prompts: use detected harnesses and defaults
      --force         Replace an existing, different "learn" skill folder
      --dry-run       Show what would happen without writing anything
  -h, --help          Show this help
  -v, --version       Show version

${c.bold('Examples')}
  npx learn-anything-skill
  npx learn-anything-skill -y
  npx learn-anything-skill --agent claude-code,codex,opencode
  npx learn-anything-skill --project --agent cursor
  npx learn-anything-skill uninstall --all

Then, in your agent:  ${c.cyan('/learn go')}   ${c.cyan('/learn kubernetes lang=fr')}   ${c.cyan('/learn flutter level=beginner')}
`;

function parseArgs(argv) {
  const opts = { command: 'install', agents: null, all: false, scope: null, dirs: [], yes: false, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('-')) fail(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case 'install':
      case 'add':
        opts.command = 'install';
        break;
      case 'uninstall':
      case 'remove':
        opts.command = 'uninstall';
        break;
      case 'list':
      case 'ls':
        opts.command = 'list';
        break;
      case '-a':
      case '--agent':
      case '--agents':
        opts.agents = next().split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--all':
        opts.all = true;
        break;
      case '-p':
      case '--project':
        opts.scope = 'project';
        break;
      case '-g':
      case '--global':
        opts.scope = 'global';
        break;
      case '--dir':
        opts.dirs.push(path.resolve(next()));
        break;
      case '-y':
      case '--yes':
        opts.yes = true;
        break;
      case '--force':
        opts.force = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '-h':
      case '--help':
      case 'help':
        opts.command = 'help';
        break;
      case '-v':
      case '--version':
        opts.command = 'version';
        break;
      default:
        fail(`Unknown argument: ${a}\nRun with --help to see the options.`);
    }
  }
  return opts;
}

function fail(msg) {
  console.error(c.red('✗ ') + msg);
  process.exit(1);
}

const tilde = (p) => (p.startsWith(os.homedir()) ? '~' + p.slice(os.homedir().length) : p);

/** Group harnesses sharing the same target directory so the skill is written once. */
function groupTargets(harnesses, scope) {
  const map = new Map();
  for (const h of harnesses) {
    const dir = targetDir(h, scope);
    if (!map.has(dir)) map.set(dir, []);
    map.get(dir).push(h);
  }
  return [...map.entries()].map(([dir, hs]) => ({ dir, harnesses: hs }));
}

async function chooseHarnesses(all, opts) {
  if (opts.agents) {
    const known = new Map(all.map((h) => [h.id, h]));
    const unknown = opts.agents.filter((id) => !known.has(id));
    if (unknown.length) fail(`Unknown harness id(s): ${unknown.join(', ')}\nKnown: ${all.map((h) => h.id).join(', ')}`);
    return opts.agents.map((id) => known.get(id));
  }
  if (opts.all) return all;

  const detected = all.filter((h) => h.detected);
  if (opts.yes || !isInteractive()) {
    if (!detected.length) fail('No agent harness detected. Use --agent <id>, --all or --dir <path>.');
    return detected;
  }

  const items = all.map((h) => ({
    label: h.name.padEnd(28),
    hint: h.detected ? c.green('detected') : 'not detected',
    checked: h.detected,
  }));
  const picked = await select('Install the "learn" skill for which agents?', items, { multi: true });
  if (picked === null) process.exit(130);
  return picked.map((i) => all[i]);
}

async function chooseScope(opts) {
  if (opts.scope) return opts.scope;
  if (opts.yes || !isInteractive()) return 'global';
  const i = await select('Where?', [
    { label: 'Global', hint: 'available in every project (recommended)' },
    { label: 'This project', hint: path.resolve('.') },
  ]);
  if (i === null) process.exit(130);
  return i === 0 ? 'global' : 'project';
}

function printDetection(all) {
  console.log(c.bold('\nAgent harnesses on this machine'));
  for (const h of all) {
    const mark = h.detected ? c.green('●') : c.dim('○');
    const where = h.detected ? c.dim(h.evidence.map(tilde).join(', ')) : c.dim('not detected');
    console.log(`  ${mark} ${h.name.padEnd(28)} ${c.dim(h.id.padEnd(15))} ${where}`);
  }
}

async function runInstall(opts) {
  const all = detectHarnesses();
  const meta = readSkillMeta(SKILL_SOURCE);
  console.log(`\n${c.bold('learn')} skill ${c.dim('v' + (meta && meta.version))} — hands-on courses for any technology`);

  let targets = [];
  if (opts.dirs.length && !opts.agents && !opts.all) {
    targets = opts.dirs.map((dir) => ({ dir, harnesses: [{ name: 'custom' }] }));
  } else {
    printDetection(all);
    console.log('');
    const chosen = await chooseHarnesses(all, opts);
    if (!chosen.length) fail('Nothing selected.');
    const scope = await chooseScope(opts);
    targets = groupTargets(chosen, scope).concat(opts.dirs.map((dir) => ({ dir, harnesses: [{ name: 'custom' }] })));
  }

  if (!opts.yes && isInteractive()) {
    console.log(c.bold('\nThe skill will be written to:'));
    for (const t of targets) console.log(`  ${tilde(path.join(t.dir, 'learn'))}  ${c.dim(t.harnesses.map((h) => h.name).join(', '))}`);
    if (!(await confirm('\nProceed?'))) process.exit(0);
  }

  console.log('');
  let ok = 0;
  for (const t of targets) {
    const r = installTo(t.dir, { force: opts.force, dryRun: opts.dryRun });
    const who = c.dim(t.harnesses.map((h) => h.name).join(', '));
    if (r.status === 'skipped') console.log(`  ${c.yellow('!')} ${tilde(r.dest)}  ${c.yellow(r.reason)}`);
    else {
      ok++;
      console.log(`  ${c.green('✓')} ${r.status.padEnd(9)} ${tilde(r.dest)}  ${who}`);
    }
  }
  if (!ok) process.exit(1);
  if (opts.dryRun) return console.log(c.yellow('\n(dry run — nothing was written)'));

  console.log(`
${c.bold('Done!')} Restart your agent (or start a new session), then try:

  ${c.cyan('/learn go')}                      a full Go course in your current folder
  ${c.cyan('/learn kubernetes lang=fr')}      a Kubernetes course in French
  ${c.cyan('/learn flutter goal="a shop app"')}
  ${c.cyan('/learn status')} · ${c.cyan('/learn check')} · ${c.cyan('/learn hint')} · ${c.cyan('/learn next')}

${c.dim('Agents without slash commands: just ask "use the learn skill to teach me rust".')}
${c.dim('Docs & issues: ' + pkg.homepage)}
`);
}

async function runUninstall(opts) {
  const all = detectHarnesses();
  const scope = opts.scope || 'global';
  let chosen;
  if (opts.agents) chosen = await chooseHarnesses(all, opts);
  else chosen = all; // remove from wherever it is installed
  const targets = groupTargets(chosen, scope).concat(opts.dirs.map((dir) => ({ dir, harnesses: [] })));
  let removed = 0;
  for (const t of targets) {
    const r = uninstallFrom(t.dir, { force: opts.force, dryRun: opts.dryRun });
    if (r.status === 'removed') {
      removed++;
      console.log(`  ${c.green('✓')} removed  ${tilde(r.dest)}`);
    } else if (r.status === 'skipped') console.log(`  ${c.yellow('!')} ${tilde(r.dest)}  ${c.yellow(r.reason)}`);
  }
  console.log(removed ? c.bold(`\nRemoved from ${removed} location(s).`) : 'The skill was not installed in any known location.');
}

function runList() {
  const all = detectHarnesses();
  printDetection(all);
  console.log(c.bold('\nInstalled "learn" skill'));
  let any = false;
  for (const scope of ['global', 'project']) {
    for (const t of groupTargets(all, scope)) {
      const meta = readSkillMeta(path.join(t.dir, 'learn'));
      if (meta && meta.name === 'learn') {
        any = true;
        console.log(`  ${c.green('✓')} v${meta.version || '?'}  ${tilde(path.join(t.dir, 'learn'))}  ${c.dim(scope)}`);
      }
    }
  }
  if (!any) console.log(c.dim('  not installed yet — run: npx learn-anything-skill'));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'help') return console.log(HELP);
  if (opts.command === 'version') return console.log(pkg.version);
  if (opts.command === 'list') return runList();
  if (opts.command === 'uninstall') return runUninstall(opts);
  return runInstall(opts);
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));

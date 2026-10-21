// Learn Studio — the whole course in the browser.
//
// A small local server (127.0.0.1 only) that serves:
//   - lessons, exercises, quizzes and capstone milestones rendered as HTML;
//   - real terminals (node-pty) opened in the exercise folder;
//   - a file editor restricted to the course folder;
//   - progress, recomputed from .learn/results.log (written by tools/check.*).
//
// Run: `npm start` in studio/, or `./studio.sh` (`.\studio.ps1` on Windows) at the course root.
// Self-test: `node server.js --check` validates the course manifest and quizzes, then exits.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseQuizMarkdown } from './quiz.js';
import { translator } from './public/i18n.js';

const require = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PUBLIC = path.join(HERE, 'public');
const HOST = '127.0.0.1';
const LEARN = path.join(ROOT, '.learn');
const COURSE_FILE = path.join(LEARN, 'course.json');
const PROGRESS_FILE = path.join(LEARN, 'progress.json');
const RESULTS_FILE = path.join(LEARN, 'results.log');
const IS_WIN = process.platform === 'win32';

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// Port: STUDIO_PORT, else studio/studio.json, else course.json → studio.port, else 4242.
const PORT = Number(process.env.STUDIO_PORT || readJson(path.join(HERE, 'studio.json'), {}).port
  || readJson(COURSE_FILE, {}).studio?.port || 4242);

// ─── security ────────────────────────────────────────────────────────────────
// The server opens shells: refuse anything that does not come from this page
// (Host check against DNS rebinding, Origin check against other open sites).
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
const ALLOWED_ORIGINS = new Set([...ALLOWED_HOSTS].map((h) => `http://${h}`));

function hostOk(req) { return ALLOWED_HOSTS.has(req.headers.host || ''); }
function originOk(req) {
  const o = req.headers.origin;
  return o ? ALLOWED_ORIGINS.has(o) : false;
}

// Course-relative path → absolute path, or null if it escapes the course.
function inRoot(rel) {
  if (typeof rel !== 'string') return null;
  const abs = path.resolve(ROOT, rel.replace(/^[/\\]+/, ''));
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}
const relOf = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ─── course ──────────────────────────────────────────────────────────────────
function loadCourse() {
  const c = JSON.parse(fs.readFileSync(COURSE_FILE, 'utf8'));
  c.modules ||= [];
  for (const m of c.modules) { m.lessons ||= []; m.exercises ||= []; }
  return c;
}
const tFor = (course) => translator(course.params?.lang || 'en');

function index(course) {
  const lessons = new Map(), exercises = new Map(), milestones = new Map(), modules = new Map();
  for (const m of course.modules) {
    modules.set(m.id, m);
    for (const l of m.lessons) lessons.set(l.id, { ...l, module: m.id });
    for (const e of m.exercises) exercises.set(e.id, { ...e, module: m.id });
  }
  for (const ms of course.capstone?.milestones || []) milestones.set(String(ms.id), { ...ms, id: String(ms.id) });
  return { lessons, exercises, milestones, modules };
}

// The milestone a module ends with: `module.milestone` is a file path (or an id).
function moduleMilestoneId(m, idx) {
  if (!m.milestone) return null;
  const ref = String(m.milestone).replace(/^\.\//, '');
  for (const [id, ms] of idx.milestones) if (ms.file === ref || id === ref || ms.module === m.id) return id;
  const guess = path.basename(ref).slice(0, 2);
  return idx.milestones.has(guess) ? guess : null;
}

function milestoneTitle(ms) {
  if (ms.title) return ms.title;
  try {
    const h = fs.readFileSync(path.join(ROOT, ms.file), 'utf8').match(/^#\s+(.+)$/m);
    // "Milestone 03 — Deploy the API" / "Jalon 03 : ..." → "Deploy the API"
    if (h) return h[1].replace(/^[^\d—:–-]{0,24}\d+\s*[—:–-]\s*/, '').trim();
  } catch { /* missing file: fall back to the file name */ }
  return path.basename(ms.file || String(ms.id), '.md').replace(/^\d+-/, '').replace(/-/g, ' ');
}

// Where the learner builds the capstone. course.json capstone.dir wins even before it exists
// (some courses create capstone/app/ from starter/ at the first milestone).
function capstoneDir(course) {
  if (course.capstone?.dir) return String(course.capstone.dir).replace(/\\/g, '/').replace(/\/+$/, '');
  if (exists('capstone/app')) return 'capstone/app';
  let readme = '';
  try { readme = fs.readFileSync(path.join(ROOT, 'capstone/README.md'), 'utf8'); } catch {}
  if (/capstone\/app\//.test(readme)) return 'capstone/app';
  return exists('capstone/starter') ? 'capstone/starter' : 'capstone';
}

// ─── progress ────────────────────────────────────────────────────────────────
function readResults() {
  const out = new Map();
  let text = '';
  try { text = fs.readFileSync(RESULTS_FILE, 'utf8'); } catch { return out; }
  for (const line of text.split(/\r?\n/)) {
    const [at, rawTarget, res] = line.split('\t');
    if (!at || !rawTarget || !res) continue;
    const target = rawTarget.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    const r = out.get(target) || { attempts: 0, fails: 0, last: null, lastAt: null, firstPassAt: null };
    r.attempts++;
    if (res.trim() === 'pass') r.firstPassAt ??= at; else r.fails++;
    r.last = res.trim(); r.lastAt = at;
    out.set(target, r);
  }
  return out;
}

function readProgress() {
  return readJson(PROGRESS_FILE, null)
    || { schema: 1, startedAt: null, lastActivity: null, lessons: {}, exercises: {}, milestones: {}, quizzes: {}, weakConcepts: {}, streakDays: 0, notes: [] };
}
function writeProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2) + '\n'); }

const dayKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function streak(dates) {
  const days = new Set(dates.map(dayKey));
  const d = new Date();
  if (!days.has(dayKey(d.toISOString()))) d.setDate(d.getDate() - 1); // the streak holds until tonight
  let n = 0;
  while (days.has(dayKey(d.toISOString()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Recompute progress.json from results.log (the source of truth for grading),
// keeping what only the learner can tell (lessons read, quizzes, hints, solutions viewed).
function reconcile() {
  const course = loadCourse();
  const idx = index(course);
  const results = readResults();
  const p = readProgress();
  p.lessons ||= {}; p.exercises ||= {}; p.milestones ||= {}; p.quizzes ||= {}; p.weakConcepts ||= {};

  for (const [id, ex] of idx.exercises) {
    const r = results.get(ex.path);
    if (!r) continue;
    const prev = p.exercises[id] || {};
    p.exercises[id] = {
      ...prev,
      status: r.last === 'pass' ? 'passed' : 'failing',
      attempts: r.attempts,
      firstPassAt: r.firstPassAt,
      hintsUsed: prev.hintsUsed || 0,
      solutionViewed: !!prev.solutionViewed,
    };
  }
  for (const [id] of idx.milestones) {
    const r = results.get(`capstone/${id}`);
    if (!r) continue;
    p.milestones[id] = { status: r.last === 'pass' ? 'passed' : 'failing', at: r.lastAt, attempts: r.attempts };
  }

  // Weak concepts: exercises with 3+ failures or a level-3 hint (+1 per concept), missed quiz questions.
  const weak = {};
  for (const [id, ex] of idx.exercises) {
    const r = results.get(ex.path);
    if ((r && r.fails >= 3) || (p.exercises[id]?.hintsUsed || 0) >= 3) for (const c of ex.concepts || []) weak[c] = (weak[c] || 0) + 1;
  }
  for (const [mid, q] of Object.entries(p.quizzes)) {
    if (q.missed?.length) { const k = `quiz ${mid}`; weak[k] = (weak[k] || 0) + q.missed.length; }
    for (const c of q.missedConcepts || []) weak[c] = (weak[c] || 0) + 1;
  }
  p.weakConcepts = weak;

  const dates = [
    ...Object.values(p.lessons).map((l) => l.at),
    ...Object.values(p.quizzes).map((q) => q.at),
    ...[...results.values()].map((r) => r.lastAt),
  ];
  try {
    for (const line of fs.readFileSync(RESULTS_FILE, 'utf8').split(/\r?\n/)) {
      const at = line.split('\t')[0]; if (at) dates.push(at);
    }
  } catch { /* nothing graded yet */ }
  const activity = dates.filter(Boolean).sort();
  if (activity.length) {
    p.startedAt = p.startedAt && p.startedAt < activity[0] ? p.startedAt : activity[0];
    p.lastActivity = activity.at(-1);
  }
  p.streakDays = streak(activity);

  const before = fs.existsSync(PROGRESS_FILE) ? fs.readFileSync(PROGRESS_FILE, 'utf8') : '';
  const after = JSON.stringify(p, null, 2) + '\n';
  if (before !== after) {
    fs.writeFileSync(PROGRESS_FILE, after);
    writeProgressMd(course, idx, p);
  }
  return { course, idx, results, progress: p };
}

function bar(pct) { const n = Math.round(pct / 10); return '█'.repeat(n) + '░'.repeat(10 - n); }
const stars = (d) => '★'.repeat(d || 1) + '☆'.repeat(Math.max(0, 3 - (d || 1)));
function fmtDate(iso, lang) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso.slice(0, 10); }
}

function moduleStats(m, p, idx) {
  const ms = moduleMilestoneId(m, idx);
  const items = [
    ...m.lessons.map((l) => !!p.lessons[l.id]?.done),
    ...m.exercises.map((e) => p.exercises[e.id]?.status === 'passed'),
    ...(exists(`${m.slug}/quiz.md`) ? [!!p.quizzes[m.id]] : []),
    ...(ms ? [p.milestones[ms]?.status === 'passed'] : []),
  ];
  const done = items.filter(Boolean).length;
  return { done, total: items.length, pct: items.length ? Math.round((100 * done) / items.length) : 0, milestoneId: ms };
}

function writeProgressMd(course, idx, p) {
  const t = tFor(course);
  const lang = course.params?.lang || 'en';
  const exTotal = idx.exercises.size;
  const exDone = [...idx.exercises.keys()].filter((id) => p.exercises[id]?.status === 'passed').length;
  const msTotal = idx.milestones.size;
  const msDone = [...idx.milestones.keys()].filter((id) => p.milestones[id]?.status === 'passed').length;
  const x = (b) => (b ? 'x' : ' ');
  const nn = (i) => String(i + 1).padStart(2, '0');
  const lines = [
    `# ${t('pm_title', { tech: course.params?.technology || course.params?.slug || '' })}`,
    '',
    t('pm_meta', { s: fmtDate(p.startedAt, lang), l: fmtDate(p.lastActivity, lang), n: t.plural(p.streakDays || 0, 'pm_days_one', 'pm_days_many') }),
    '',
    t('pm_overall', { bar: bar((100 * exDone) / (exTotal || 1)), x: exDone, y: exTotal, m: msDone, k: msTotal }),
    '',
    t('pm_note'),
    '',
  ];
  for (const m of course.modules) {
    const s = moduleStats(m, p, idx);
    lines.push(`## ${m.id} — ${m.title}  ${bar(s.pct)} ${s.pct}%`);
    m.lessons.forEach((l, i) => lines.push(`- [${x(p.lessons[l.id]?.done)}] ${t('pm_lesson', { n: nn(i), t: l.title })}`));
    m.exercises.forEach((e, i) => lines.push(`- [${x(p.exercises[e.id]?.status === 'passed')}] ${t('pm_exercise', { n: nn(i), t: e.title, stars: stars(e.difficulty) })}`));
    if (exists(`${m.slug}/quiz.md`)) {
      const q = p.quizzes[m.id];
      lines.push(`- [${x(q)}] ${t('pm_quiz')}${q ? ` (${q.score}/${q.total})` : ''}`);
    }
    if (s.milestoneId) {
      const ms = idx.milestones.get(s.milestoneId);
      lines.push(`- [${x(p.milestones[s.milestoneId]?.status === 'passed')}] ${t('pm_milestone', { id: s.milestoneId, t: ms ? milestoneTitle(ms) : '' })}`);
    }
    lines.push('');
  }
  const weak = Object.entries(p.weakConcepts).sort((a, b) => b[1] - a[1]);
  if (weak.length) {
    lines.push(`## ${t('pm_weak')}`);
    for (const [c, n] of weak) lines.push(`- ${c} (${n})`);
    lines.push('');
  }
  fs.writeFileSync(path.join(ROOT, 'PROGRESS.md'), lines.join('\n'));
}

function nextStep(course, idx, p) {
  for (const m of course.modules) {
    for (const l of m.lessons) if (!p.lessons[l.id]?.done) return { kind: 'lesson', id: l.id, title: l.title, module: m.id };
    for (const e of m.exercises) if (p.exercises[e.id]?.status !== 'passed') return { kind: 'exercise', id: e.id, title: e.title, module: m.id };
    if (exists(`${m.slug}/quiz.md`) && !p.quizzes[m.id]) return { kind: 'quiz', id: m.id, title: m.title, module: m.id };
    const ms = moduleMilestoneId(m, idx);
    if (ms && p.milestones[ms]?.status !== 'passed') return { kind: 'milestone', id: ms, title: milestoneTitle(idx.milestones.get(ms)), module: m.id };
  }
  return null;
}

const scriptExists = (dir, name) => exists(`${dir}/${name}.sh`) || exists(`${dir}/${name}.ps1`);
const solutionDir = (exPath) => exPath.replace('/exercises/', '/solutions/');

function state() {
  const { course, idx, results, progress } = reconcile();
  const modules = course.modules.map((m) => {
    const s = moduleStats(m, progress, idx);
    return {
      id: m.id, slug: m.slug, title: m.title, estimatedHours: m.estimatedHours,
      readme: `${m.slug}/README.md`,
      quiz: exists(`${m.slug}/quiz.md`) ? `${m.slug}/quiz.md` : null,
      milestone: s.milestoneId,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, file: l.file, done: !!progress.lessons[l.id]?.done })),
      exercises: m.exercises.map((e) => {
        const r = results.get(e.path);
        return {
          id: e.id, title: e.title, path: e.path, difficulty: e.difficulty, concepts: e.concepts, requires: e.requires || [],
          status: r ? (r.last === 'pass' ? 'passed' : 'failing') : 'todo', attempts: r?.attempts || 0,
          hasSetup: scriptExists(e.path, 'setup'),
          hasReset: scriptExists(e.path, 'reset'),
          solution: exists(solutionDir(e.path)),
          solutionViewed: !!progress.exercises[e.id]?.solutionViewed,
        };
      }),
      stats: s,
    };
  });
  const milestones = [...idx.milestones.values()].map((ms) => {
    const r = results.get(`capstone/${ms.id}`);
    return { id: ms.id, file: ms.file, title: milestoneTitle(ms), status: r ? (r.last === 'pass' ? 'passed' : 'failing') : 'todo', attempts: r?.attempts || 0 };
  });
  return {
    title: course.params?.technology || course.params?.slug || 'Course',
    lang: course.params?.lang || 'en',
    goal: course.params?.goal, level: course.params?.level,
    capstone: { title: course.capstone?.title || null, dir: capstoneDir(course), readme: exists('capstone/README.md') },
    playground: exists('playground'),
    docs: { readme: exists('README.md'), setup: exists('SETUP.md'), studio: exists('studio/README.md') },
    platform: process.platform,
    modules, milestones, progress, next: nextStep(course, idx, progress),
  };
}

// ─── Markdown rendering ──────────────────────────────────────────────────────
let markedLib, hljs;
async function loadRenderers() {
  ({ Marked: markedLib } = await import('marked'));
  hljs = (await import('highlight.js')).default;
}

const LANG_ALIAS = {
  console: 'shell', sh: 'bash', zsh: 'bash', shell: 'bash', ps: 'powershell', ps1: 'powershell', pwsh: 'powershell',
  gitignore: 'ini', gitattributes: 'ini', dockerignore: 'ini', env: 'ini', suggestion: 'diff', text: 'plaintext', txt: 'plaintext',
  hcl: 'ini', tf: 'ini', terraform: 'ini', jsonc: 'json', json5: 'json', vue: 'xml', svelte: 'xml', golang: 'go', py: 'python',
  rs: 'rust', kt: 'kotlin', kts: 'kotlin', yml: 'yaml', proto: 'protobuf', mjs: 'javascript', cjs: 'javascript',
};
const RUNNABLE = new Set(['', 'console', 'bash', 'sh', 'shell', 'zsh', 'powershell', 'ps1', 'pwsh', 'ps']);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
}

// Internal link to a Studio route (#/...) instead of a raw file.
function routeFor(relPath, idx) {
  const clean = relPath.replace(/\/$/, '');
  for (const [id, l] of idx.lessons) if (l.file === clean) return `#/l/${id}`;
  for (const [id, e] of idx.exercises) if (clean === e.path || clean === `${e.path}/README.md`) return `#/e/${id}`;
  for (const [id, ms] of idx.milestones) if (ms.file === clean) return `#/c/${id}`;
  for (const [id, m] of idx.modules) {
    if (clean === m.slug || clean === `${m.slug}/README.md`) return `#/m/${id}`;
    if (clean === `${m.slug}/quiz.md`) return `#/q/${id}`;
    if (clean === `${m.slug}/lessons` || clean === `${m.slug}/exercises`) return `#/m/${id}`;
  }
  if (clean === '' || clean === '.' || clean === 'README.md') return '#/doc/README.md';
  if (clean === 'PROGRESS.md') return '#/';
  if (clean === 'capstone' || clean === 'capstone/README.md') return '#/capstone';
  if (clean === 'playground' || clean === 'playground/README.md') return '#/playground';
  const abs = inRoot(clean);
  if (abs && fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return fs.existsSync(path.join(abs, 'README.md')) ? `#/doc/${clean}/README.md` : `#/files/${clean}`;
  }
  return `#/doc/${clean}`;
}

function renderMarkdown(src, docRel, idx) {
  const docDir = path.posix.dirname(docRel);
  const seen = new Map();
  const marked = new markedLib({ gfm: true });
  marked.use({
    renderer: {
      code({ text, lang }) {
        const l0 = (lang || '').split(/\s/)[0].toLowerCase();
        const l = LANG_ALIAS[l0] || l0;
        const html = l && hljs.getLanguage(l) ? hljs.highlight(text, { language: l, ignoreIllegals: true }).value : esc(text);
        return `<pre class="code" data-lang="${esc(l0)}"${RUNNABLE.has(l0) ? ' data-run="1"' : ''}><code class="hljs">${html}</code></pre>\n`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        let id = slugify(inner) || 'section';
        const n = seen.get(id) || 0; seen.set(id, n + 1);
        if (n) id += `-${n}`;
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const t = title ? ` title="${esc(title)}"` : '';
        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return `<a href="${esc(href)}"${t} target="_blank" rel="noopener">${text}</a>`;
        if (href.startsWith('#')) return `<a href="${esc(href)}" data-anchor="${esc(href.slice(1))}"${t}>${text}</a>`;
        const [p, anchor] = href.split('#');
        let rel;
        try { rel = path.posix.normalize(path.posix.join(docDir, decodeURIComponent(p))); } catch { rel = path.posix.normalize(path.posix.join(docDir, p)); }
        if (rel.startsWith('..')) return `<span>${text}</span>`;
        return `<a href="${esc(routeFor(rel, idx))}"${anchor ? ` data-goto="${esc(anchor)}"` : ''}${t}>${text}</a>`;
      },
      image({ href, title, text }) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return `<img src="${esc(href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ''}>`;
        const rel = path.posix.normalize(path.posix.join(docDir, href));
        return `<img src="/raw/${esc(rel)}" alt="${esc(text)}">`;
      },
    },
  });
  return marked.parse(src);
}

function renderQuiz(src, docRel, idx) {
  const { introMd, questions } = parseQuizMarkdown(src);
  return {
    introHtml: renderMarkdown(introMd, docRel, idx),
    questions: questions.map((q) => ({
      n: q.n,
      html: renderMarkdown(q.md, docRel, idx),
      options: q.options.map((o) => ({ letter: o.letter, html: renderMarkdown(o.md, docRel, idx).trim().replace(/^<p>|<\/p>$/g, '') })),
      correct: q.correct,
      answerHtml: renderMarkdown(q.answerMd, docRel, idx),
    })),
  };
}

// ─── file tree ───────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.act-cache', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache', 'target',
  '.dart_tool', '.gradle', 'build', '.next', '.nuxt', 'dist', '.terraform', '.idea', 'vendor', 'bin', 'obj', '.cache',
]);
async function tree(abs, depth = 0, budget = { n: 3000 }) {
  let entries = [];
  try { entries = await fsp.readdir(abs, { withFileTypes: true }); } catch { return []; }
  entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
  const out = [];
  for (const e of entries) {
    if (budget.n-- <= 0) break;
    const full = path.join(abs, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) { out.push({ name: e.name, path: relOf(full), dir: true, skipped: true, children: [] }); continue; }
      out.push({ name: e.name, path: relOf(full), dir: true, children: depth < 8 ? await tree(full, depth + 1, budget) : [] });
    } else if (e.isFile() || e.isSymbolicLink()) {
      out.push({ name: e.name, path: relOf(full) });
    }
  }
  return out;
}

// ─── HTTP ────────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
};
const VENDOR = {
  xterm: path.join(HERE, 'node_modules/@xterm/xterm'),
  'xterm-fit': path.join(HERE, 'node_modules/@xterm/addon-fit'),
  'xterm-links': path.join(HERE, 'node_modules/@xterm/addon-web-links'),
  codemirror: path.join(HERE, 'node_modules/codemirror'),
};

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function serveFile(res, abs, base) {
  if (base && !abs.startsWith(base + path.sep)) return send(res, 404, { error: 'not found' });
  try {
    const st = await fsp.stat(abs);
    if (!st.isFile()) return send(res, 404, { error: 'not found' });
    send(res, 200, await fsp.readFile(abs), MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream');
  } catch { send(res, 404, { error: 'not found' }); }
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isBinary(buf) { return buf.subarray(0, 8000).includes(0); }

async function handle(req, res) {
  if (!hostOk(req)) return send(res, 403, { error: 'host refused' });
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  if (req.method !== 'GET' && !originOk(req)) return send(res, 403, { error: 'origin refused' });

  if (p === '/' || p === '/index.html') return serveFile(res, path.join(PUBLIC, 'index.html'));
  if (p.startsWith('/static/')) return serveFile(res, path.join(PUBLIC, p.slice(8)), PUBLIC);
  if (p.startsWith('/vendor/')) {
    const [, , name, ...rest] = p.split('/');
    const base = VENDOR[name];
    if (!base) return send(res, 404, { error: 'not found' });
    return serveFile(res, path.join(base, ...rest), base);
  }
  if (p.startsWith('/raw/')) {
    const abs = inRoot(decodeURIComponent(p.slice(5)));
    return abs ? serveFile(res, abs) : send(res, 403, { error: 'outside the course' });
  }

  try {
    if (p === '/api/state' && req.method === 'GET') return send(res, 200, state());

    if (p === '/api/doc' && req.method === 'GET') {
      const rel = url.searchParams.get('path') || '';
      const abs = inRoot(rel);
      if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, { error: `Not found: ${rel}` });
      const idx = index(loadCourse());
      const buf = await fsp.readFile(abs);
      const r = relOf(abs);
      if (isBinary(buf)) return send(res, 200, { path: r, html: `<p><a href="/raw/${esc(r)}" target="_blank">${esc(r)}</a></p>` });
      const src = buf.toString('utf8');
      if (/\.(md|markdown)$/i.test(abs)) return send(res, 200, { path: r, html: renderMarkdown(src, r, idx) });
      const fence = src.includes('```') ? '~~~~' : '```';
      return send(res, 200, { path: r, html: renderMarkdown(`${fence}${path.extname(abs).slice(1)}\n${src}\n${fence}`, r, idx) });
    }

    if (p === '/api/quiz' && req.method === 'GET') {
      const idx = index(loadCourse());
      const m = idx.modules.get(url.searchParams.get('module'));
      if (!m) return send(res, 404, { error: 'unknown module' });
      const rel = `${m.slug}/quiz.md`;
      const src = await fsp.readFile(path.join(ROOT, rel), 'utf8');
      return send(res, 200, { module: m.id, title: m.title, ...renderQuiz(src, rel, idx) });
    }

    if (p === '/api/tree' && req.method === 'GET') {
      const abs = inRoot(url.searchParams.get('dir') || '');
      if (!abs) return send(res, 403, { error: 'outside the course' });
      if (!fs.existsSync(abs)) return send(res, 200, { dir: relOf(abs), exists: false, children: [] });
      return send(res, 200, { dir: relOf(abs), exists: true, children: await tree(abs) });
    }

    if (p === '/api/file') {
      const abs = inRoot(url.searchParams.get('path') || '');
      if (!abs || abs === ROOT) return send(res, 403, { error: 'outside the course' });
      const rel = relOf(abs);
      if (rel === '.learn' || rel.startsWith('.learn/')) return send(res, 403, { error: '.learn/ is managed by the Studio' });
      if (req.method === 'GET') {
        const buf = await fsp.readFile(abs);
        if (isBinary(buf)) return send(res, 200, { path: rel, binary: true });
        if (buf.length > 1024 * 1024) return send(res, 200, { path: rel, tooBig: true });
        return send(res, 200, { path: rel, content: buf.toString('utf8') });
      }
      if (req.method === 'PUT') {
        if (rel === 'studio' || rel.startsWith('studio/')) return send(res, 403, { error: 'studio/ is read-only here' });
        const body = JSON.parse(await readBody(req));
        if (typeof body.content !== 'string') return send(res, 400, { error: 'content must be a string' });
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        await fsp.writeFile(abs, body.content);
        return send(res, 200, { ok: true });
      }
    }

    if (p === '/api/solution' && req.method === 'GET') {
      const idx = index(loadCourse());
      const ex = idx.exercises.get(url.searchParams.get('id'));
      if (!ex) return send(res, 404, { error: 'unknown exercise' });
      const solRel = solutionDir(ex.path);
      const solAbs = inRoot(solRel);
      if (!solAbs || !fs.existsSync(solAbs)) return send(res, 404, { error: 'no solution' });
      const pr = readProgress();
      pr.exercises ||= {};
      pr.exercises[ex.id] = { ...(pr.exercises[ex.id] || { status: 'todo', attempts: 0, hintsUsed: 0 }), solutionViewed: true };
      writeProgress(pr);
      const notes = ['NOTES.md', 'README.md'].map((n) => path.join(solAbs, n)).find((f) => fs.existsSync(f));
      return send(res, 200, {
        dir: solRel,
        notesHtml: notes ? renderMarkdown(await fsp.readFile(notes, 'utf8'), relOf(notes), idx) : '',
        files: await tree(solAbs),
      });
    }

    if (p === '/api/progress' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const pr = readProgress();
      const now = new Date().toISOString();
      pr.lessons ||= {}; pr.quizzes ||= {}; pr.exercises ||= {};
      if (body.type === 'lesson') {
        if (body.done) pr.lessons[body.id] = { done: true, at: now }; else delete pr.lessons[body.id];
      } else if (body.type === 'quiz') {
        const prev = pr.quizzes[body.module];
        pr.quizzes[body.module] = {
          ...(prev || {}),
          score: Number(body.score) || 0, total: Number(body.total) || 0, at: now,
          missed: Array.isArray(body.missed) ? body.missed : [],
          best: Math.max(Number(body.score) || 0, prev?.best ?? prev?.score ?? 0), attempts: (prev?.attempts || 0) + 1,
        };
      } else if (body.type === 'hint') {
        const e = pr.exercises[body.id] || { status: 'todo', attempts: 0, hintsUsed: 0, solutionViewed: false };
        e.hintsUsed = Math.max(e.hintsUsed || 0, Number(body.level) || 1);
        pr.exercises[body.id] = e;
      } else return send(res, 400, { error: 'unknown type' });
      pr.lastActivity = now;
      pr.startedAt ||= now;
      writeProgress(pr);
      return send(res, 200, state());
    }
  } catch (err) {
    return send(res, 500, { error: String(err.message || err) });
  }
  send(res, 404, { error: 'not found' });
}

// ─── terminals ───────────────────────────────────────────────────────────────
// action=shell: an interactive shell in `cwd`.
// Other actions run a fixed command built here (never a command sent by the client).
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// Run `<dir>/<name>.ps1` on Windows when it exists, else `<dir>/<name>.sh` with bash.
// `dir` is relative to `cwd` ('.' for scripts in the working folder itself).
function scriptCommand(cwdRel, dir, name, args = []) {
  const rel = dir === '.' ? name : `${dir}/${name}`;
  const ps1 = path.join(ROOT, cwdRel, `${rel}.ps1`);
  if (IS_WIN && fs.existsSync(ps1)) {
    return { file: 'powershell.exe', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, ...args], show: [`.\\${rel.replace(/\//g, '\\')}.ps1`, ...args].join(' ') };
  }
  const line = [`./${rel}.sh`, ...args.map(shq)].join(' ');
  return { file: IS_WIN ? 'bash.exe' : '/bin/bash', args: ['-lc', line], show: [`./${rel}.sh`, ...args].join(' ') };
}

function commandFor(action, target, idx) {
  const ex = idx.exercises.get(target);
  switch (action) {
    case 'setup': if (ex) return { cwd: ex.path, ...scriptCommand(ex.path, '.', 'setup') }; break;
    case 'reset': if (ex) return { cwd: ex.path, ...scriptCommand(ex.path, '.', 'reset') }; break;
    case 'check': if (ex) return { cwd: '', ...scriptCommand('', 'tools', 'check', [ex.path]) }; break;
    case 'milestone': if (idx.milestones.has(target)) return { cwd: '', ...scriptCommand('', 'tools', 'check', ['capstone', target]) }; break;
  }
  return null;
}

function defaultShell() {
  if (IS_WIN) return { file: process.env.STUDIO_SHELL || 'powershell.exe', args: ['-NoLogo'] };
  return { file: process.env.STUDIO_SHELL || process.env.SHELL || '/bin/bash', args: ['-l'] };
}

function openPty(pty, ws, url) {
  const action = url.searchParams.get('action') || 'shell';
  const cols = Math.max(20, Math.min(400, Number(url.searchParams.get('cols')) || 100));
  const rows = Math.max(5, Math.min(200, Number(url.searchParams.get('rows')) || 30));
  const env = { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', LEARN_STUDIO: '1' };
  delete env.NO_COLOR;
  const t = tFor(loadCourse());
  const say = (d) => ws.send(JSON.stringify({ t: 'o', d }));

  let cwd, file, args;
  if (action === 'shell') {
    cwd = inRoot(url.searchParams.get('cwd') || '');
    while (cwd && !fs.existsSync(cwd)) cwd = path.dirname(cwd); // e.g. work/ not created yet
    if (!cwd) { ws.close(); return; }
    ({ file, args } = defaultShell());
  } else {
    const c = commandFor(action, url.searchParams.get('target'), index(loadCourse()));
    if (!c) { say('\r\nUnknown action.\r\n'); ws.close(); return; }
    cwd = path.join(ROOT, c.cwd); file = c.file; args = c.args;
    say(`\x1b[2m$ ${c.show}\x1b[0m\r\n`);
  }

  let term;
  try { term = pty.spawn(file, args, { name: 'xterm-256color', cols, rows, cwd, env }); } catch (err) {
    say(`\r\n${t('oops')}: ${err.message}\r\n`); ws.close(); return;
  }
  term.onData((d) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: 'o', d })); });
  term.onExit(({ exitCode }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ t: 'x', code: exitCode }));
      ws.close();
    }
  });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.t === 'i' && typeof m.d === 'string') term.write(m.d);
    else if (m.t === 'r') { try { term.resize(Math.max(20, m.cols | 0), Math.max(5, m.rows | 0)); } catch { /* already exited */ } }
  });
  ws.on('close', () => { try { term.kill(); } catch { /* already exited */ } });
}

// ─── self-check (`node server.js --check`) ───────────────────────────────────
function selfCheck() {
  const errors = [], warnings = [];
  let course;
  try { course = loadCourse(); } catch (e) { console.error(`✗ .learn/course.json: ${e.message}`); return 1; }
  const idx = index(course);
  const need = (rel, what) => { if (!rel) errors.push(`${what}: missing path`); else if (!exists(rel)) errors.push(`${what}: ${rel} not found`); };
  if (!course.modules.length) errors.push('course.json has no modules');
  let quizzes = 0, questions = 0;
  for (const m of course.modules) {
    if (!m.id || !m.slug) errors.push(`module ${JSON.stringify(m.title || m)}: id and slug are required`);
    need(`${m.slug}/README.md`, `module ${m.id} README`);
    for (const l of m.lessons) need(l.file, `lesson ${l.id}`);
    for (const e of m.exercises) {
      need(e.path, `exercise ${e.id}`);
      if (e.path && !exists(`${e.path}/README.md`)) warnings.push(`exercise ${e.id}: no README.md (statement) in ${e.path}`);
      if (e.path && !exists(solutionDir(e.path))) warnings.push(`exercise ${e.id}: no solution folder ${solutionDir(e.path)}`);
    }
    if (m.milestone && !moduleMilestoneId(m, idx)) warnings.push(`module ${m.id}: milestone ${m.milestone} is not in capstone.milestones`);
    const qRel = `${m.slug}/quiz.md`;
    if (exists(qRel)) {
      quizzes++;
      const { questions: qs } = parseQuizMarkdown(fs.readFileSync(path.join(ROOT, qRel), 'utf8'));
      questions += qs.length;
      if (!qs.length) errors.push(`${qRel}: no question found (see references/pedagogy.md › Quiz file format)`);
      for (const q of qs) {
        if (q.options.length && !q.correct.length) warnings.push(`${qRel} question ${q.n}: options but no answer letter at the start of <details> — it will be self-graded`);
        if (!q.answerMd) warnings.push(`${qRel} question ${q.n}: empty answer`);
      }
    } else warnings.push(`module ${m.id}: no quiz.md`);
  }
  for (const [id, ms] of idx.milestones) need(ms.file, `milestone ${id}`);
  if (!exists('tools/check.sh') && !exists('tools/check.ps1')) errors.push('tools/check.sh (or check.ps1) not found');
  for (const v of Object.values(VENDOR)) if (!fs.existsSync(v)) errors.push(`dependency missing: ${path.relative(HERE, v)} — run \`npm install\` in studio/`);
  try { require.resolve('node-pty'); } catch { errors.push('node-pty is not installed — run `npm install` in studio/'); }

  console.log(`Course: ${course.params?.technology || '?'} · lang=${course.params?.lang || 'en'} · ${course.modules.length} modules · ${idx.lessons.size} lessons · ${idx.exercises.size} exercises · ${idx.milestones.size} milestones · ${quizzes} quizzes (${questions} questions)`);
  console.log(`Capstone workdir: ${capstoneDir(course)}/`);
  for (const w of warnings) console.log(`! ${w}`);
  for (const e of errors) console.log(`✗ ${e}`);
  console.log(errors.length ? `✗ ${errors.length} error(s), ${warnings.length} warning(s)` : `✓ Studio check passed (${warnings.length} warning(s))`);
  return errors.length ? 1 : 0;
}

// ─── start ───────────────────────────────────────────────────────────────────
if (process.argv.includes('--check')) {
  process.exitCode = selfCheck();
} else {
  const pty = require('node-pty');
  const { WebSocketServer } = await import('ws');
  await loadRenderers();

  const wss = new WebSocketServer({ noServer: true });
  const server = http.createServer((req, res) => { handle(req, res); });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/pty' || !hostOk(req) || !originOk(req)) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => openPty(pty, ws, url));
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Is the Studio already running? Otherwise: STUDIO_PORT=<port> npm start`);
    else console.error(err);
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    reconcile();
    console.log(`Learn Studio ready: http://localhost:${PORT}  (course: ${ROOT})`);
  });
}

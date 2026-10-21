// Learn Studio — course UI (single page, no build step, hash routing).

import { translator } from './i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
let t = translator('en');

// ─── API ─────────────────────────────────────────────────────────────────────
async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
const getDoc = (path) => api(`/api/doc?path=${encodeURIComponent(path)}`);

let S = null; // course state (modules, statuses, progress)
async function refresh(data) {
  S = data || await api('/api/state');
  renderSidebar();
  renderTopProgress();
  return S;
}

function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

// Static labels in index.html carry data-i18n / data-i18n-title / data-i18n-label.
function translateStatic() {
  document.documentElement.lang = S.lang;
  document.title = `Studio · ${S.title}`;
  $('#brand-title').textContent = S.title;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}

// ─── course index ────────────────────────────────────────────────────────────
const find = {
  lesson: (id) => { for (const m of S.modules) { const i = m.lessons.findIndex((l) => l.id === id); if (i >= 0) return { m, l: m.lessons[i], i }; } return null; },
  exercise: (id) => { for (const m of S.modules) { const e = m.exercises.find((x) => x.id === id); if (e) return { m, e }; } return null; },
  module: (id) => S.modules.find((m) => m.id === id),
  milestone: (id) => S.milestones.find((x) => x.id === id),
};
const stars = (d) => '★'.repeat(d || 1) + '☆'.repeat(Math.max(0, 3 - (d || 1)));
const statusLabel = (s) => t(`status_${s}`);
const capstoneName = () => S.capstone.title || t('nav_capstone');
const msLabel = (ms) => t('milestone_n', { id: ms.id, title: ms.title });
const attempts = (n) => t.plural(n, 'attempts_one', 'attempts_many');
const fmtDate = (iso, opts) => { try { return new Date(iso).toLocaleDateString(S.lang, opts); } catch { return iso.slice(0, 10); } };

function ring(pct) {
  const r = 7, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  const col = pct >= 100 ? 'var(--ok)' : 'var(--accent)';
  return `<svg class="ring" viewBox="0 0 18 18" aria-label="${pct}%"><circle cx="9" cy="9" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="3"/>` +
    `<circle cx="9" cy="9" r="${r}" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 9 9)" stroke-linecap="round"/></svg>`;
}

// Linear path through the course, for "next / previous".
function sequence() {
  const seq = [];
  for (const m of S.modules) {
    m.lessons.forEach((l) => seq.push({ href: `#/l/${l.id}`, title: l.title }));
    m.exercises.forEach((e) => seq.push({ href: `#/e/${e.id}`, title: e.title }));
    if (m.quiz) seq.push({ href: `#/q/${m.id}`, title: t('quiz_title', { title: m.title }) });
    if (m.milestone) { const ms = find.milestone(m.milestone); if (ms) seq.push({ href: `#/c/${ms.id}`, title: msLabel(ms) }); }
  }
  return seq;
}
function neighbours(href) {
  const seq = sequence(); const i = seq.findIndex((s) => s.href === href);
  return { prev: seq[i - 1], next: seq[i + 1] };
}

// ─── sidebar / top bar ───────────────────────────────────────────────────────
function renderSidebar() {
  const cur = location.hash || '#/';
  const openMod = currentModuleId();
  const link = (href, icon, label) => `<a class="nav-link${cur === href ? ' active' : ''}" href="${href}"><span>${icon}</span>${esc(label)}</a>`;
  const item = (href, kind, label, cls) => `<a href="${href}" class="${cur === href ? 'active' : ''}" title="${esc(label)}"><span class="dot ${cls || ''}"></span><span class="kind">${kind}</span><span class="label">${esc(label)}</span></a>`;
  $('#sidebar').innerHTML = `
    <div class="nav-top">
      ${link('#/', '◇', t('nav_dashboard'))}
      ${S.milestones.length || S.capstone.readme ? link('#/capstone', '◆', capstoneName()) : ''}
      ${S.playground ? link('#/playground', '▸', t('nav_playground')) : ''}
      ${S.docs.setup ? link('#/doc/SETUP.md', '⚙', t('nav_setup')) : ''}
    </div>
    <div class="nav-sep">${esc(t('nav_modules'))}</div>
    ${S.modules.map((m) => `
      <details class="mod" ${m.id === openMod ? 'open' : ''}>
        <summary><span class="mod-num">${esc(m.id)}</span><span class="mod-title" title="${esc(m.title)}">${esc(m.title)}</span>${ring(m.stats.pct)}</summary>
        <div class="mod-items">
          ${item(`#/m/${m.id}`, '≡', t('nav_overview'), '')}
          ${m.lessons.map((l) => item(`#/l/${l.id}`, t('k_lesson'), l.title, l.done ? 'done' : '')).join('')}
          ${m.exercises.map((e) => item(`#/e/${e.id}`, t('k_exercise'), e.title, e.status)).join('')}
          ${m.quiz ? item(`#/q/${m.id}`, t('k_quiz'), t('kind_quiz'), S.progress.quizzes?.[m.id] ? 'done' : '') : ''}
          ${m.milestone ? (() => { const ms = find.milestone(m.milestone); return ms ? item(`#/c/${ms.id}`, t('k_milestone'), msLabel(ms), ms.status) : ''; })() : ''}
        </div>
      </details>`).join('')}
  `;
  const active = $('#sidebar a.active');
  if (active && !renderSidebar.scrolled) { active.scrollIntoView({ block: 'center' }); renderSidebar.scrolled = true; }
}

function currentModuleId() {
  const [, kind, id] = (location.hash || '#/').split('/');
  if (kind === 'l') return find.lesson(id)?.m.id;
  if (kind === 'e') return find.exercise(id)?.m.id;
  if (kind === 'm' || kind === 'q') return id;
  if (kind === 'c') return S.modules.find((m) => m.milestone === id)?.id;
  return null;
}

function totals() {
  const ex = S.modules.flatMap((m) => m.exercises);
  const ls = S.modules.flatMap((m) => m.lessons);
  return {
    exDone: ex.filter((e) => e.status === 'passed').length, exTotal: ex.length,
    msDone: S.milestones.filter((m) => m.status === 'passed').length, msTotal: S.milestones.length,
    lsDone: ls.filter((l) => l.done).length, lsTotal: ls.length,
  };
}

function renderTopProgress() {
  const n = totals();
  const pct = Math.round((100 * n.exDone) / (n.exTotal || 1));
  $('#top-progress').innerHTML = `
    <div class="progress ${pct === 100 ? 'ok' : ''}" style="width:160px"><span style="width:${pct}%"></span></div>
    <span class="pill">${esc(t('top_exercises', { d: n.exDone, t: n.exTotal }))}</span>
    ${n.msTotal ? `<span class="pill">${esc(t('top_milestones', { d: n.msDone, t: n.msTotal }))}</span>` : ''}
    <span class="pill">${S.progress.streakDays ? esc(t('streak_short', { n: S.progress.streakDays })) : ''}</span>`;
}

// ─── terminals ───────────────────────────────────────────────────────────────
const TERM_THEME = {
  background: '#141417', foreground: '#e7e3da', cursor: '#f0764d', selectionBackground: '#3b3b44',
  black: '#1b1b1f', red: '#ef6f62', green: '#7fd48f', yellow: '#e5c07b', blue: '#82aaff', magenta: '#d7a3f0', cyan: '#89ddcf', white: '#d8d4cb',
  brightBlack: '#6a6760', brightRed: '#ff8c80', brightGreen: '#9de6aa', brightYellow: '#f2d38d', brightBlue: '#a5c3ff', brightMagenta: '#e6bdf7', brightCyan: '#a9eadf', brightWhite: '#ffffff',
};

class Term {
  constructor({ action = 'shell', cwd = '', target = '', onExit } = {}) {
    Object.assign(this, { action, cwd, target, onExit });
    this.el = h('<div style="height:100%"></div>');
    this.x = new window.Terminal({
      fontFamily: 'JetBrains Mono, Fira Code, ui-monospace, Menlo, Consolas, monospace', fontSize: 13.5, lineHeight: 1.15,
      cursorBlink: action === 'shell', scrollback: 8000, theme: TERM_THEME, allowProposedApi: true,
      disableStdin: action !== 'shell',
    });
    this.fit = new window.FitAddon.FitAddon();
    this.x.loadAddon(this.fit);
    this.x.loadAddon(new window.WebLinksAddon.WebLinksAddon());
    this.opened = false; this.exited = false;
    this.ro = new ResizeObserver(() => this.refit());
  }
  mount(host) {
    this.host = host;
    host.appendChild(this.el);
    this.ro.disconnect(); this.ro.observe(host);
    if (!this.opened) {
      this.x.open(this.el); this.opened = true;
      requestAnimationFrame(() => { this.refit(); this.connect(); });
    } else requestAnimationFrame(() => this.refit());
  }
  refit() {
    if (!this.host || !this.host.offsetWidth || !this.host.offsetHeight) return;
    try { this.fit.fit(); } catch { /* not visible yet */ }
  }
  connect() {
    const q = new URLSearchParams({ action: this.action, cwd: this.cwd, target: this.target, cols: this.x.cols, rows: this.x.rows });
    this.ws = new WebSocket(`ws://${location.host}/pty?${q}`);
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.t === 'o') this.x.write(m.d);
      else if (m.t === 'x') { this.exited = true; this.onExit?.(m.code); }
    };
    this.ws.onclose = () => {
      if (this.action === 'shell' && !this.disposed) this.showEnded();
      else if (!this.exited && !this.disposed) { this.exited = true; this.onExit?.(-1); }
    };
    this.x.onData((d) => this.send({ t: 'i', d }));
    this.x.onResize(({ cols, rows }) => this.send({ t: 'r', cols, rows }));
  }
  send(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  paste(text) { this.x.paste(text); this.x.focus(); }
  focus() { this.x.focus(); }
  showEnded() {
    if (!this.host || $('.term-ended', this.host)) return;
    const b = h(`<div class="term-ended">${esc(t('session_ended'))} <button class="btn small">${esc(t('new_shell'))}</button></div>`);
    b.querySelector('button').onclick = () => { b.remove(); this.restart(); };
    this.host.appendChild(b);
  }
  restart() {
    const host = this.host;
    this.dispose();
    const n = new Term({ action: this.action, cwd: this.cwd, target: this.target, onExit: this.onExit });
    shells.set(this.cwd, n);
    if (host) { host.innerHTML = ''; n.mount(host); setTimeout(() => n.focus(), 50); }
    return n;
  }
  dispose() { this.disposed = true; this.ro.disconnect(); try { this.ws?.close(); } catch { /* closed */ } this.x.dispose(); this.el.remove(); }
}

const shells = new Map(); // cwd → Term (shells survive navigation)
function shellFor(cwd) {
  let s = shells.get(cwd);
  if (!s || s.disposed) { s = new Term({ cwd }); shells.set(cwd, s); }
  return s;
}

// ─── terminal drawer (playground) ────────────────────────────────────────────
const drawer = {
  cwd: 'playground',
  open() {
    $('#drawer').hidden = false; document.body.classList.add('drawer-open');
    const s = shellFor(this.cwd);
    if (s.host !== $('#drawer-body')) { $('#drawer-body').innerHTML = ''; s.mount($('#drawer-body')); }
    setTimeout(() => { s.refit(); s.focus(); }, 60);
    store.set('studio-drawer', true);
  },
  close() { $('#drawer').hidden = true; document.body.classList.remove('drawer-open'); store.set('studio-drawer', false); },
  toggle() { $('#drawer').hidden ? this.open() : this.close(); },
  paste(text) { this.open(); setTimeout(() => shellFor(this.cwd).paste(text), 80); },
};
function setupDrawer() {
  drawer.cwd = S.playground ? 'playground' : '';
  $('#drawer-cwd').textContent = drawer.cwd ? `${drawer.cwd}/` : './';
  const hgt = store.get('studio-drawer-h', null);
  if (hgt) document.documentElement.style.setProperty('--drawer-h', `${hgt}px`);
  $('#drawer-btn').onclick = () => drawer.toggle();
  $('#drawer-close').onclick = () => drawer.close();
  $('#drawer-restart').onclick = () => { const s = shells.get(drawer.cwd); if (s) { s.restart(); } else drawer.open(); };
  window.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === '`') { e.preventDefault(); drawer.toggle(); } });
  $('#drawer-grip').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const move = (ev) => {
      const px = Math.max(140, Math.min(window.innerHeight - 160, window.innerHeight - ev.clientY));
      document.documentElement.style.setProperty('--drawer-h', `${px}px`);
      store.set('studio-drawer-h', px);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); shells.get(drawer.cwd)?.refit(); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });
}

// ─── prose: links, anchors, code blocks ──────────────────────────────────────
let pendingAnchor = null;
function enhanceProse(root, { paste } = {}) {
  root.querySelectorAll('a[data-anchor]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    root.querySelector(`#${CSS.escape(a.dataset.anchor)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  root.querySelectorAll('a[data-goto]').forEach((a) => a.addEventListener('click', () => { pendingAnchor = a.dataset.goto; }));
  root.querySelectorAll('pre.code').forEach((pre) => {
    const tools = h(`<div class="code-tools"><button type="button">${esc(t('copy'))}</button></div>`);
    const raw = pre.textContent;
    tools.firstChild.onclick = async () => {
      try { await navigator.clipboard.writeText(raw); toast(t('copied')); } catch { toast(t('copy_failed')); }
    };
    if (pre.dataset.run && paste) {
      const b = h(`<button type="button" title="${esc(t('to_terminal_title'))}">${esc(t('to_terminal'))}</button>`);
      b.onclick = () => paste(commandsOf(raw, pre.dataset.lang));
      tools.appendChild(b);
    }
    pre.appendChild(tools);
  });
}
// "console" blocks: keep only the command lines ($ … or PS> …), not the output.
function commandsOf(text, lang) {
  const lines = text.replace(/\n$/, '').split('\n');
  const prompt = /^(\$|PS[^>]*>|>)\s/;
  if (lang === 'console' || lines.some((l) => /^(\$|PS[^>]*>)\s/.test(l))) {
    return lines.filter((l) => prompt.test(l)).map((l) => l.replace(prompt, '')).join('\n');
  }
  return lines.join('\n');
}
function scrollToPending(container) {
  if (!pendingAnchor) return;
  const el = container.querySelector(`#${CSS.escape(pendingAnchor)}`);
  pendingAnchor = null;
  if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 30);
}

// ─── views ───────────────────────────────────────────────────────────────────
const main = () => $('#main');
function setMain(node, { fill = false } = {}) {
  const m = main();
  m.style.overflow = fill ? 'hidden' : '';
  m.replaceChildren(node);
  if (!fill) m.scrollTop = 0;
}

function viewDashboard() {
  const n = totals();
  const nx = S.next;
  const nextHref = nx ? { lesson: `#/l/${nx.id}`, exercise: `#/e/${nx.id}`, quiz: `#/q/${nx.id}`, milestone: `#/c/${nx.id}` }[nx.kind] : null;
  const nextTitle = nx ? (nx.kind === 'quiz' ? t('quiz_title', { title: nx.title }) : nx.kind === 'milestone' ? t('milestone_n', { id: nx.id, title: nx.title }) : nx.title) : '';
  const failing = S.modules.flatMap((m) => m.exercises).filter((e) => e.status === 'failing');
  const weak = Object.entries(S.progress.weakConcepts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const started = S.progress.startedAt ? fmtDate(S.progress.startedAt, { day: 'numeric', month: 'long' }) : null;
  const level = S.level ? t(`level_${S.level}`) : '';
  const stat = (v, total, k) => `<div class="stat"><div class="v">${v}${total != null ? `<span class="muted" style="font-size:16px">/${total}</span>` : ''}</div><div class="k">${esc(k)}</div></div>`;
  const doc = (href, label, tag) => `<a class="row" href="${href}"><span class="label">${esc(label)}</span><span class="tag">${tag}</span></a>`;
  setMain(h(`
    <div class="page">
      <div class="eyebrow">${esc(level.startsWith('level_') ? S.level : level)}${started ? ` · ${esc(t('started_on', { date: started }))}` : ''}</div>
      <h1 class="title">${esc(S.title)}</h1>
      <p class="lede">${esc(S.goal || '')}</p>
      ${nx ? `
      <div class="hero" style="margin-top:22px">
        <div class="what"><div class="eyebrow">${esc(S.progress.lastActivity ? t('resume') : t('begin'))} · ${esc(t(`kind_${nx.kind}`))} · ${esc(t('module_n', { id: nx.module }))}</div><h2>${esc(nextTitle)}</h2></div>
        <a class="btn primary" href="${nextHref}">${esc(t('continue'))}</a>
      </div>` : `<div class="hero" style="margin-top:22px"><div class="what"><h2>${esc(t('all_done'))}</h2></div></div>`}
      <div class="stat-row">
        ${stat(n.lsDone, n.lsTotal, t('stat_lessons'))}
        ${stat(n.exDone, n.exTotal, t('stat_exercises'))}
        ${n.msTotal ? stat(n.msDone, n.msTotal, t('stat_milestones')) : ''}
        ${stat(S.progress.streakDays || 0, null, S.progress.streakDays === 1 ? t('stat_streak_one') : t('stat_streak_many'))}
      </div>
      ${failing.length ? `<h2 class="section-title">${esc(t('failing_title'))}</h2><div class="list">${failing.map((e) => `
        <a class="row" href="#/e/${e.id}"><span class="dot failing"></span><span class="label">${esc(e.id)} — ${esc(e.title)}</span><span class="tag failing">${esc(attempts(e.attempts))}</span></a>`).join('')}</div>` : ''}
      ${weak.length ? `<h2 class="section-title">${esc(t('weak_title'))}</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${weak.map(([c, k]) => `<span class="tag warn">${esc(c)} · ${k}</span>`).join('')}</div>` : ''}
      <h2 class="section-title">${esc(t('modules_title'))}</h2>
      <div class="grid cards">
        ${S.modules.map((m) => `
          <a class="card mod-card" href="#/m/${m.id}">
            <div class="eyebrow">${esc(t('module_label', { id: m.id }))}</div>
            <h3>${esc(m.title)}</h3>
            <div class="progress ${m.stats.pct === 100 ? 'ok' : ''}"><span style="width:${m.stats.pct}%"></span></div>
            <div class="meta"><span>${esc(t('n_exercises', { d: m.exercises.filter((e) => e.status === 'passed').length, t: m.exercises.length }))}</span><span>${m.stats.pct}%</span></div>
          </a>`).join('')}
      </div>
      <h2 class="section-title">${esc(t('docs_title'))}</h2>
      <div class="list">
        ${S.docs.readme ? doc('#/doc/README.md', t('doc_readme'), 'README') : ''}
        ${S.docs.setup ? doc('#/doc/SETUP.md', t('doc_setup'), 'SETUP') : ''}
        ${S.docs.studio ? doc('#/doc/studio/README.md', t('doc_studio'), 'Studio') : ''}
      </div>
    </div>`));
}

async function viewDoc(path) {
  const d = await getDoc(path);
  const page = h(`<div class="page"><article class="prose">${d.html}</article></div>`);
  enhanceProse(page, { paste: (x) => drawer.paste(x) });
  setMain(page);
  scrollToPending(page);
}

async function viewFiles(dir) {
  const tr = await api(`/api/tree?dir=${encodeURIComponent(dir)}`);
  const page = h(`<div class="page"><div class="eyebrow">${esc(t('folder'))}</div><h1 class="title">${esc(dir)}/</h1><div class="list" style="margin-top:16px"></div></div>`);
  const list = $('.list', page);
  for (const c of tr.children) {
    list.appendChild(h(`<a class="row" href="${c.dir ? `#/files/${esc(c.path)}` : `#/doc/${esc(c.path)}`}"><span class="kind">${c.dir ? '▸' : '·'}</span><span class="label">${esc(c.name)}${c.dir ? '/' : ''}</span></a>`));
  }
  setMain(page);
}

async function viewModule(id) {
  const m = find.module(id);
  if (!m) return viewNotFound();
  const d = await getDoc(m.readme).catch(() => ({ html: '' }));
  const ms = m.milestone ? find.milestone(m.milestone) : null;
  const q = S.progress.quizzes?.[m.id];
  const page = h(`
    <div class="page">
      <div class="eyebrow">${esc(t('module_meta', { id: m.id, h: m.estimatedHours || '?', pct: m.stats.pct }))}</div>
      <div class="progress ${m.stats.pct === 100 ? 'ok' : ''}" style="margin:10px 0 26px;max-width:360px"><span style="width:${m.stats.pct}%"></span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start;margin-bottom:28px">
        <div><h2 class="section-title" style="margin-top:0">${esc(t('lessons'))}</h2><div class="list">
          ${m.lessons.map((l, i) => `<a class="row" href="#/l/${l.id}"><span class="dot ${l.done ? 'done' : ''}"></span><span class="label">${i + 1}. ${esc(l.title)}</span>${l.done ? `<span class="tag done">${esc(t('lesson_read'))}</span>` : ''}</a>`).join('')}
        </div></div>
        <div><h2 class="section-title" style="margin-top:0">${esc(t('exercises'))}</h2><div class="list">
          ${m.exercises.map((e) => `<a class="row" href="#/e/${e.id}"><span class="dot ${e.status}"></span><span class="label">${esc(e.title)} <span class="stars">${stars(e.difficulty)}</span></span><span class="tag ${e.status}">${esc(statusLabel(e.status))}</span></a>`).join('')}
          ${m.quiz ? `<a class="row" href="#/q/${m.id}"><span class="dot ${q ? 'done' : ''}"></span><span class="label">${esc(t('module_quiz'))}</span>${q ? `<span class="tag done">${q.score}/${q.total}</span>` : `<span class="tag">${esc(t('todo'))}</span>`}</a>` : ''}
          ${ms ? `<a class="row" href="#/c/${ms.id}"><span class="dot ${ms.status}"></span><span class="label">${esc(msLabel(ms))}</span><span class="tag ${ms.status}">${esc(statusLabel(ms.status))}</span></a>` : ''}
        </div></div>
      </div>
      <article class="prose" style="max-width:none">${d.html}</article>
    </div>`);
  enhanceProse(page, { paste: (x) => drawer.paste(x) });
  setMain(page);
}

async function viewLesson(id) {
  const f = find.lesson(id);
  if (!f) return viewNotFound();
  const { m, l, i } = f;
  const d = await getDoc(l.file);
  const { prev, next } = neighbours(`#/l/${id}`);
  const page = h(`
    <div class="page">
      <div class="prose" style="margin-bottom:8px"><div class="eyebrow"><a href="#/m/${m.id}">${esc(t('module_label', { id: m.id }))} — ${esc(m.title)}</a> · ${esc(t('lesson_of', { i: i + 1, n: m.lessons.length }))}</div></div>
      <article class="prose">${d.html}</article>
      <div class="lesson-foot">
        <button class="btn ${l.done ? 'ok' : 'primary'}" id="mark">${esc(l.done ? t('lesson_done') : t('mark_read'))}</button>
        <button class="btn ghost" id="try">${esc(t('try_terminal'))}</button>
        <span class="spacer"></span>
        ${prev ? `<a class="btn ghost" href="${prev.href}">${esc(t('prev'))}</a>` : ''}
        ${next ? `<a class="btn" href="${next.href}" title="${esc(next.title)}">${esc(t('next'))}</a>` : ''}
      </div>
    </div>`);
  enhanceProse(page, { paste: (x) => drawer.paste(x) });
  $('#try', page).onclick = () => drawer.open();
  $('#mark', page).onclick = async () => {
    const done = !find.lesson(id).l.done;
    await refresh(await api('/api/progress', { method: 'POST', body: { type: 'lesson', id, done } }));
    if (done) { toast(t('lesson_marked')); if (next) location.hash = next.href; else route(); } else route();
  };
  setMain(page);
  scrollToPending(page);
}

// ─── quiz ────────────────────────────────────────────────────────────────────
async function viewQuiz(id) {
  const m = find.module(id);
  if (!m) return viewNotFound();
  const qz = await api(`/api/quiz?module=${encodeURIComponent(id)}`);
  const prev = S.progress.quizzes?.[id];
  const answers = new Map(); // n → true/false
  const page = h(`
    <div class="page" style="max-width:860px">
      <div class="eyebrow"><a href="#/m/${m.id}">${esc(t('module_label', { id: m.id }))} — ${esc(m.title)}</a></div>
      <article class="prose" style="max-width:none">${qz.introHtml}</article>
      ${prev ? `<p class="muted">${t('quiz_last', { s: prev.score, t: prev.total })}${prev.best != null ? esc(t('quiz_best', { b: prev.best, t: prev.total })) : ''}. ${esc(t('quiz_retry'))}</p>` : ''}
      <div class="quiz-score"><strong id="qs-count">0/${qz.questions.length}</strong><div class="progress"><span id="qs-bar" style="width:0%"></span></div><span id="qs-score" class="muted">${esc(t('score', { n: 0 }))}</span></div>
      <div id="qs"></div>
      <div id="qs-end"></div>
    </div>`);
  const host = $('#qs', page);

  const update = async () => {
    const done = answers.size, ok = [...answers.values()].filter(Boolean).length;
    $('#qs-count', page).textContent = `${done}/${qz.questions.length}`;
    $('#qs-bar', page).style.width = `${(100 * done) / qz.questions.length}%`;
    $('#qs-score', page).textContent = t('score', { n: ok });
    if (done === qz.questions.length) {
      const missed = qz.questions.filter((q) => !answers.get(q.n)).map((q) => q.n);
      await refresh(await api('/api/progress', { method: 'POST', body: { type: 'quiz', module: id, score: ok, total: done, missed } }));
      const { next } = neighbours(`#/q/${id}`);
      const verdict = ok === done ? t('quiz_perfect') : ok >= done * 0.75 ? t('quiz_solid') : t('quiz_review');
      $('#qs-end', page).innerHTML = `
        <div class="hero" style="margin-top:24px">
          <div class="what"><div class="eyebrow">${esc(t('quiz_done'))}</div><h2>${ok}/${done} ${esc(verdict)}</h2>
          ${missed.length ? `<p class="muted" style="margin:6px 0 0">${esc(t('quiz_missed', { list: missed.join(', ') }))}</p>` : ''}</div>
          <button class="btn ghost" id="again">${esc(t('quiz_again'))}</button>
          ${next ? `<a class="btn primary" href="${next.href}">${esc(t('next'))}</a>` : ''}
        </div>`;
      $('#again', page).onclick = () => viewQuiz(id);
    }
  };

  for (const q of qz.questions) {
    const card = h(`<section class="quiz-q"><div class="qnum">${esc(t('question', { n: q.n }).toUpperCase())}</div><div class="prose">${q.html}</div></section>`);
    const reveal = (verdict) => {
      const a = h(`<div class="answer">${verdict || ''}<div class="prose">${q.answerHtml}</div></div>`);
      card.appendChild(a);
      enhanceProse(a);
    };
    if (q.options.length && q.correct.length) {
      const opts = h('<div class="opts"></div>');
      for (const o of q.options) {
        const b = h(`<button class="opt" type="button"><span class="l">${esc(o.letter)})</span><span>${o.html}</span></button>`);
        b.onclick = () => {
          const right = q.correct.includes(o.letter);
          opts.querySelectorAll('.opt').forEach((x, i) => {
            x.disabled = true;
            if (q.correct.includes(q.options[i].letter)) x.classList.add('right');
          });
          if (!right) b.classList.add('wrong');
          b.classList.add('chosen');
          answers.set(q.n, right);
          reveal(`<div class="verdict ${right ? 'ok' : 'bad'}">${esc(right ? t('right_answer') : t('wrong_answer', { x: q.correct.join(', ') }))}</div>`);
          update();
        };
        opts.appendChild(b);
      }
      card.appendChild(opts);
    } else {
      // Open question: write an answer, reveal, then self-grade honestly.
      if (q.options.length) {
        card.appendChild(h(`<div class="opts">${q.options.map((o) => `<div class="opt" style="cursor:default"><span class="l">${esc(o.letter)})</span><span>${o.html}</span></div>`).join('')}</div>`));
      }
      const ta = h(`<textarea class="quiz-input" placeholder="${esc(t('quiz_placeholder'))}"></textarea>`);
      const btn = h(`<div class="self-grade"><button class="btn" type="button">${esc(t('show_answer'))}</button></div>`);
      btn.firstChild.onclick = () => {
        btn.remove(); ta.readOnly = true;
        reveal('');
        const g = h(`<div class="self-grade"><span class="muted">${esc(t('self_grade'))}</span><button class="btn ok small" type="button">${esc(t('yes'))}</button><button class="btn small" type="button">${esc(t('no'))}</button></div>`);
        const [yes, no] = g.querySelectorAll('button');
        const set = (v) => { answers.set(q.n, v); g.innerHTML = `<span class="verdict ${v ? 'ok' : 'bad'}">${esc(v ? t('counted_right') : t('counted_wrong'))}</span>`; update(); };
        yes.onclick = () => set(true); no.onclick = () => set(false);
        card.appendChild(g);
      };
      card.appendChild(ta); card.appendChild(btn);
    }
    enhanceProse(card);
    host.appendChild(card);
  }
  setMain(page);
}

// ─── workspace: exercise or milestone ────────────────────────────────────────
const wsState = new Map(); // key → { run: Term, status, output, file }

const MODE_BY_EXT = {
  yml: 'yaml', yaml: 'yaml', sh: 'shell', bash: 'shell', zsh: 'shell', js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: { name: 'javascript', json: true }, jsonc: { name: 'javascript', json: true }, ts: 'text/typescript', mts: 'text/typescript',
  jsx: 'jsx', tsx: { name: 'jsx', base: { name: 'javascript', typescript: true } },
  md: 'markdown', ini: 'properties', cfg: 'properties', conf: 'properties', env: 'properties', toml: 'toml', diff: 'diff', patch: 'diff',
  html: 'htmlmixed', htm: 'htmlmixed', vue: 'htmlmixed', svelte: 'htmlmixed', xml: 'xml', svg: 'xml', css: 'css', scss: 'text/x-scss', less: 'text/x-less',
  py: 'python', go: 'go', rs: 'rust', sql: 'sql', rb: 'ruby', php: 'php', swift: 'swift', dart: 'dart',
  c: 'text/x-csrc', h: 'text/x-csrc', cpp: 'text/x-c++src', cc: 'text/x-c++src', hpp: 'text/x-c++src',
  java: 'text/x-java', kt: 'text/x-kotlin', kts: 'text/x-kotlin', scala: 'text/x-scala', cs: 'text/x-csharp',
  ps1: 'powershell', psm1: 'powershell', lua: 'lua', pl: 'perl', r: 'r', jl: 'julia', erl: 'erlang', groovy: 'groovy', gradle: 'groovy',
  hs: 'haskell', clj: 'clojure', cljs: 'clojure', ml: 'mllike', fs: 'text/x-fsharp', elm: 'elm', proto: 'protobuf', cmake: 'cmake',
  tf: 'properties', hcl: 'properties', ex: 'ruby', exs: 'ruby',
};
const TAB_INDENT = new Set(['go']);
const FOUR_INDENT = new Set(['python', 'rust', 'text/x-java', 'text/x-kotlin', 'text/x-csharp', 'text/x-csrc', 'text/x-c++src', 'php', 'swift', 'powershell', 'text/x-scala']);
function modeFor(name) {
  if (/^Dockerfile/i.test(name) || /\.dockerfile$/i.test(name)) return 'dockerfile';
  if (/^(Makefile|GNUmakefile)$/.test(name)) return 'shell';
  if (name === 'CMakeLists.txt') return 'cmake';
  if (/^nginx.*\.conf$/.test(name)) return 'nginx';
  if (/^\.(gitignore|gitattributes|dockerignore|env|editorconfig|npmrc)/.test(name) || name === 'CODEOWNERS') return 'properties';
  if (/^(commit-msg|pre-commit|pre-push|prepare-commit-msg|post-\w+)$/.test(name)) return 'shell';
  return MODE_BY_EXT[name.split('.').pop().toLowerCase()] || null;
}

async function viewWorkspace(kind, id) {
  let title, docPath, filesDir, shellCwd, key, info, eyebrow;
  if (kind === 'exercise') {
    const f = find.exercise(id); if (!f) return viewNotFound();
    info = f.e;
    key = `e:${id}`; docPath = `${info.path}/README.md`; filesDir = info.path; shellCwd = info.path;
    title = info.title; eyebrow = `<a href="#/m/${f.m.id}">${esc(t('module_label', { id: f.m.id }))}</a> · ${esc(t('ws_exercise'))}`;
  } else {
    info = find.milestone(id); if (!info) return viewNotFound();
    key = `c:${id}`; docPath = info.file;
    filesDir = S.capstone.dir; shellCwd = S.capstone.dir;
    title = msLabel(info); eyebrow = `<a href="#/capstone">${esc(capstoneName())}</a> · ${esc(t('ws_milestone', { id }))}`;
  }
  const st = wsState.get(key) || { tab: 'term' };
  wsState.set(key, st);
  const d = await getDoc(docPath);
  const { prev, next } = neighbours(kind === 'exercise' ? `#/e/${id}` : `#/c/${id}`);
  const status = () => (kind === 'exercise' ? find.exercise(id).e : find.milestone(id));
  const win = S.platform === 'win32';
  const checkCmd = kind === 'exercise' ? `${win ? '.\\tools\\check.ps1' : './tools/check.sh'} ${info.path}` : `${win ? '.\\tools\\check.ps1' : './tools/check.sh'} capstone ${id}`;

  const ws = h(`
    <div class="workspace" data-key="${esc(key)}">
      <div class="ws-left">
        <div class="eyebrow">${eyebrow}</div>
        <article class="prose">${d.html}</article>
        <div class="lesson-foot" style="margin-top:30px">
          ${prev ? `<a class="btn ghost small" href="${prev.href}">${esc(t('prev'))}</a>` : ''}<span class="spacer"></span>
          ${next ? `<a class="btn small" href="${next.href}" title="${esc(next.title)}">${esc(t('next'))}</a>` : ''}
        </div>
      </div>
      <div class="ws-right">
        <div class="ws-toolbar">
          ${kind === 'exercise' && info.hasSetup ? `<button class="btn" data-act="setup" title="setup">${esc(t('btn_setup'))}</button>` : ''}
          <button class="btn primary" data-act="check" title="${esc(checkCmd)}">${esc(t('btn_check'))}</button>
          ${kind === 'exercise' && info.hasReset ? `<button class="btn ghost" data-act="reset" title="reset">${esc(t('btn_reset'))}</button>` : ''}
          ${kind === 'exercise' && info.solution ? `<button class="btn ghost" data-act="solution">${esc(t('btn_solution'))}</button>` : ''}
          <div class="ws-status" id="ws-status"></div>
        </div>
        <div class="tabs">
          <button class="tab" data-tab="term">${esc(t('tab_terminal'))}</button>
          <button class="tab" data-tab="files">${esc(t('tab_files'))}</button>
          <button class="tab" data-tab="out">${esc(t('tab_output'))} <span class="badge" id="out-badge" hidden></span></button>
        </div>
        <div class="panes">
          <div class="pane" data-pane="term"><div class="term-host" id="shell-host"></div></div>
          <div class="pane" data-pane="files">
            <div class="files">
              <div class="file-tree" id="tree"></div>
              <div class="editor-wrap">
                <div class="editor-bar"><span class="name" id="ed-name">—</span><span id="ed-state" class="muted"></span><button class="btn small" id="ed-save" disabled>${esc(t('save'))}</button></div>
                <div class="editor-host" id="ed-host"><div class="editor-empty">${t('editor_empty')}</div></div>
              </div>
            </div>
          </div>
          <div class="pane" data-pane="out">
            <div class="result-banner" id="out-banner" hidden></div>
            <div class="term-host" id="out-host"><div class="editor-empty" style="color:#9a958b">${esc(t('out_empty'))}</div></div>
          </div>
        </div>
      </div>
    </div>`);
  setMain(ws, { fill: true });
  enhanceProse($('.ws-left', ws), { paste: (x) => { showTab('term'); shell.paste(x); } });
  scrollToPending($('.ws-left', ws));

  // Hints: record the hint level opened (like /learn hint). The level is the number in the <summary>.
  if (kind === 'exercise') {
    ws.querySelectorAll('.ws-left details').forEach((det) => {
      const n = Number((det.querySelector('summary')?.textContent.match(/(\d+)/) || [])[1]);
      if (n) det.addEventListener('toggle', () => { if (det.open) api('/api/progress', { method: 'POST', body: { type: 'hint', id, level: n } }).catch(() => {}); }, { once: true });
    });
  }

  const renderStatus = () => {
    const s = status();
    $('#ws-status', ws).innerHTML = `<span class="tag ${s.status}">${esc(statusLabel(s.status))}</span>${s.attempts ? `<span class="muted">${esc(attempts(s.attempts))}</span>` : ''}`;
  };
  renderStatus();

  // Tabs
  const shell = shellFor(shellCwd);
  const showTab = (tab) => {
    st.tab = tab;
    ws.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    ws.querySelectorAll('.pane').forEach((p) => { p.hidden = p.dataset.pane !== tab; });
    if (tab === 'term') { if (shell.host !== $('#shell-host', ws)) shell.mount($('#shell-host', ws)); setTimeout(() => { shell.refit(); shell.focus(); }, 30); }
    if (tab === 'files') { loadTree(); editor.reloadIfClean(); setTimeout(() => editor.cm?.refresh(), 30); }
    if (tab === 'out' && st.run) { if (st.run.host !== $('#out-host', ws)) { $('#out-host', ws).innerHTML = ''; st.run.mount($('#out-host', ws)); } setTimeout(() => st.run.refit(), 30); }
  };
  ws.querySelectorAll('.tab').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });

  // Editor
  const editor = {
    cm: null, path: null, saved: '', timer: null,
    ensure() {
      if (this.cm) return this.cm;
      $('#ed-host', ws).innerHTML = '';
      this.cm = window.CodeMirror($('#ed-host', ws), {
        lineNumbers: true, theme: 'material-darker', indentUnit: 2, tabSize: 2, indentWithTabs: false,
        matchBrackets: true, styleActiveLine: true, lineWrapping: false,
        extraKeys: { 'Ctrl-S': () => this.save(), 'Cmd-S': () => this.save(), Tab: (cm) => cm.execCommand(cm.somethingSelected() ? 'indentMore' : (cm.getOption('indentWithTabs') ? 'insertTab' : 'insertSoftTab')) },
      });
      this.cm.on('change', () => {
        const dirty = this.cm.getValue() !== this.saved;
        $('#ed-state', ws).innerHTML = dirty ? `<span class="dirty">${esc(t('modified'))}</span>` : esc(t('saved'));
        $('#ed-save', ws).disabled = !dirty;
        clearTimeout(this.timer);
        if (dirty) this.timer = setTimeout(() => this.save(), 800);
      });
      $('#ed-save', ws).onclick = () => this.save();
      return this.cm;
    },
    async open(path) {
      await this.save();
      const f = await api(`/api/file?path=${encodeURIComponent(path)}`);
      if (f.binary || f.tooBig) { toast(f.binary ? t('binary') : t('too_big')); return; }
      const cm = this.ensure();
      const mode = modeFor(path.split('/').pop());
      const modeName = typeof mode === 'string' ? mode : mode?.name;
      this.path = path; this.saved = f.content; st.file = path;
      cm.setOption('mode', mode);
      cm.setOption('indentWithTabs', TAB_INDENT.has(modeName) || /\t/.test(f.content.slice(0, 4000)));
      const unit = FOUR_INDENT.has(modeName) ? 4 : TAB_INDENT.has(modeName) ? 4 : 2;
      cm.setOption('indentUnit', unit); cm.setOption('tabSize', unit);
      cm.setValue(f.content); cm.clearHistory();
      $('#ed-name', ws).textContent = path.startsWith(filesDir + '/') ? path.slice(filesDir.length + 1) : path;
      $('#ed-state', ws).textContent = t('saved'); $('#ed-save', ws).disabled = true;
      ws.querySelectorAll('#tree .node').forEach((n) => n.classList.toggle('active', n.dataset.path === path));
      setTimeout(() => { cm.refresh(); cm.focus(); }, 20);
    },
    async save() {
      clearTimeout(this.timer);
      if (!this.cm || !this.path) return;
      const v = this.cm.getValue();
      if (v === this.saved) return;
      try {
        await api(`/api/file?path=${encodeURIComponent(this.path)}`, { method: 'PUT', body: { content: v } });
        this.saved = v;
        if (this.cm.getValue() === v) { $('#ed-state', ws).textContent = t('saved'); $('#ed-save', ws).disabled = true; }
      } catch (e) { toast(t('save_failed', { e: e.message })); }
    },
    async reloadIfClean() {
      if (!this.cm || !this.path || this.cm.getValue() !== this.saved) return;
      try {
        const f = await api(`/api/file?path=${encodeURIComponent(this.path)}`);
        if (f.content != null && f.content !== this.saved && this.cm.getValue() === this.saved) {
          const pos = this.cm.getCursor(); this.saved = f.content; this.cm.setValue(f.content); this.cm.setCursor(pos);
        }
      } catch { /* file deleted meanwhile */ }
    },
  };

  const collapsed = store.get(`studio-tree-${key}`, {});
  async function loadTree() {
    const tr = await api(`/api/tree?dir=${encodeURIComponent(filesDir)}`);
    const tree = $('#tree', ws);
    tree.innerHTML = `<div class="tree-head"><span>${esc(filesDir.split('/').pop())}/</span><button class="icon-btn" style="width:24px;height:24px;font-size:13px" title="${esc(t('refresh'))}">↻</button></div>`;
    tree.querySelector('button').onclick = loadTree;
    const walk = (nodes, depth) => {
      for (const n of nodes) {
        const pad = 8 + depth * 14;
        if (n.dir) {
          const isClosed = n.skipped || (collapsed[n.path] ?? (n.name === 'work' || n.name.startsWith('.') ? false : depth > 1));
          const el = h(`<div class="node${n.skipped ? ' dim' : ''}" style="padding-left:${pad}px"><span class="ico">${n.skipped ? '·' : isClosed ? '▸' : '▾'}</span>${esc(n.name)}/</div>`);
          if (!n.skipped) el.onclick = () => { collapsed[n.path] = !isClosed; store.set(`studio-tree-${key}`, collapsed); loadTree(); };
          tree.appendChild(el);
          if (!isClosed) walk(n.children, depth + 1);
        } else {
          const el = h(`<div class="node" data-path="${esc(n.path)}" style="padding-left:${pad}px"><span class="ico">·</span>${esc(n.name)}</div>`);
          if (n.path === editor.path) el.classList.add('active');
          el.onclick = () => editor.open(n.path);
          tree.appendChild(el);
        }
      }
    };
    if (!tr.exists) tree.appendChild(h(`<div class="node dim">${esc(t('not_exists', { d: filesDir }))}</div>`));
    walk(tr.children, 0);
  }
  if (st.file) editor.open(st.file).catch(() => { st.file = null; });

  // Actions. A command may finish after the learner left and came back:
  // update the workspace on screen (live), not necessarily this one.
  const live = () => document.querySelector(`.workspace[data-key="${CSS.escape(key)}"]`);
  const banner = (cls, text, root = ws) => { const b = $('#out-banner', root); b.className = `result-banner ${cls}`; b.innerHTML = text; b.hidden = false; };
  const badge = (cls, root = ws) => { const b = $('#out-badge', root); b.className = `badge ${cls}`; b.hidden = !cls; };
  const setBusy = (busy, root = ws) => root.querySelectorAll('[data-act]').forEach((b) => { if (b.dataset.act !== 'solution') b.disabled = busy; });
  if (st.result) { banner(st.result.cls, st.result.text); badge(st.result.badge); }

  const labels = { check: t('label_check'), setup: t('label_setup'), reset: t('label_reset') };
  async function run(action) {
    await editor.save();
    if (st.run && !st.run.exited) { toast(t('already_running')); showTab('out'); return; }
    st.run?.dispose();
    const act = action === 'check' && kind === 'milestone' ? 'milestone' : action;
    st.result = { cls: 'run', text: esc(t('running', { label: labels[action] })), badge: 'run' };
    banner(st.result.cls, st.result.text); badge('run');
    setBusy(true);
    st.run = new Term({
      action: act, target: id,
      onExit: async (code) => {
        const okRun = code === 0;
        if (action === 'check') {
          st.result = okRun
            ? { cls: 'ok', text: `${esc(t('all_green'))} ${next ? `<a class="btn ok small" style="margin-left:auto" href="${next.href}">${esc(t('next'))}</a>` : ''}`, badge: 'ok' }
            : { cls: 'bad', text: esc(t('not_yet_banner')), badge: 'bad' };
        } else {
          st.result = okRun
            ? { cls: 'ok', text: esc(t('action_done', { label: labels[action] })), badge: 'ok' }
            : { cls: 'bad', text: esc(t('action_failed', { label: labels[action], code })), badge: 'bad' };
        }
        let root = live();
        if (root) { setBusy(false, root); banner(st.result.cls, st.result.text, root); badge(st.result.badge, root); }
        await refresh();
        root = live();
        if (root) root.dispatchEvent(new CustomEvent('ws-refresh'));
        if (action === 'check') toast(okRun ? t('toast_pass') : t('toast_fail'), 2200);
      },
    });
    showTab('out');
    $('#out-host', ws).innerHTML = '';
    st.run.mount($('#out-host', ws));
  }
  ws.querySelectorAll('[data-act]').forEach((b) => {
    b.onclick = () => (b.dataset.act === 'solution' ? showSolution(id) : run(b.dataset.act));
  });
  if (st.run && !st.run.exited) setBusy(true);
  ws.addEventListener('ws-refresh', () => { renderStatus(); if (st.tab === 'files') loadTree(); });

  showTab(st.tab);
}

// ─── solution ────────────────────────────────────────────────────────────────
function modal(html) {
  $('#modal-body').innerHTML = html; $('#modal').hidden = false;
  return $('#modal-body');
}
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }

function showSolution(id) {
  const { e } = find.exercise(id);
  const body = modal(`
    <div class="eyebrow">${esc(t('sol_title', { t: e.title }))}</div>
    <h2 style="margin:6px 0 10px">${esc(t('sol_sure'))}</h2>
    <p>${esc(e.status === 'passed' ? t('sol_passed') : t('sol_not_passed'))}</p>
    <div style="display:flex;gap:8px;margin-top:16px"><button class="btn primary" id="sol-go">${esc(t('sol_show'))}</button><button class="btn ghost" id="sol-no">${esc(t('sol_not_yet'))}</button></div>`);
  $('#sol-no', body).onclick = closeModal;
  $('#sol-go', body).onclick = async () => {
    const sol = await api(`/api/solution?id=${encodeURIComponent(id)}`);
    body.innerHTML = `<div class="eyebrow">${esc(t('sol_title', { t: e.title }))}</div><article class="prose" style="max-width:none;margin-top:10px">${sol.notesHtml || `<p>${esc(t('sol_no_notes'))}</p>`}</article>
      <div class="sol-files"><div class="file-tree" id="sol-tree"></div><div id="sol-view" style="min-width:0;overflow:auto;background:var(--code-bg)"><div class="editor-empty">${esc(t('pick_file'))}</div></div></div>`;
    enhanceProse(body);
    const tree = $('#sol-tree', body);
    const walk = (nodes, depth) => nodes.forEach((n) => {
      const el = h(`<div class="node${n.dir ? ' dim' : ''}" style="padding-left:${8 + depth * 14}px"><span class="ico">${n.dir ? '▾' : '·'}</span>${esc(n.name)}${n.dir ? '/' : ''}</div>`);
      tree.appendChild(el);
      if (n.dir) walk(n.children, depth + 1);
      else el.onclick = async () => {
        tree.querySelectorAll('.node').forEach((x) => x.classList.toggle('active', x === el));
        const d = await getDoc(n.path);
        $('#sol-view', body).innerHTML = /\.md$/i.test(n.path) ? `<article class="prose" style="padding:16px;max-width:none;background:var(--surface)">${d.html}</article>` : d.html;
      };
    });
    walk(sol.files, 0);
    refresh();
  };
}

// ─── capstone / playground ───────────────────────────────────────────────────
async function viewCapstone() {
  const d = S.capstone.readme ? await getDoc('capstone/README.md') : { html: '' };
  const page = h(`
    <div class="page">
      <div class="eyebrow">${esc(t('capstone_eyebrow'))}</div>
      ${S.capstone.title ? `<h1 class="title">${esc(S.capstone.title)}</h1>` : ''}
      <h2 class="section-title" style="margin-top:6px">${esc(t('milestones'))}</h2>
      <div class="list" style="margin-bottom:30px">
        ${S.milestones.map((ms) => `<a class="row" href="#/c/${ms.id}"><span class="dot ${ms.status}"></span><span class="label">${esc(msLabel(ms))}</span><span class="tag ${ms.status}">${esc(statusLabel(ms.status))}</span></a>`).join('')}
      </div>
      <article class="prose" style="max-width:none">${d.html}</article>
    </div>`);
  enhanceProse(page, { paste: (x) => drawer.paste(x) });
  setMain(page);
}

async function viewPlayground() {
  const d = await getDoc('playground/README.md').catch(() => ({ html: '' }));
  const page = h(`<div class="page"><div class="hero" style="margin-bottom:26px"><div class="what"><div class="eyebrow">${esc(t('playground_eyebrow'))}</div><h2>${esc(t('playground_title'))}</h2></div><button class="btn primary" id="open">${esc(t('open_terminal'))}</button></div><article class="prose">${d.html}</article></div>`);
  enhanceProse(page, { paste: (x) => drawer.paste(x) });
  $('#open', page).onclick = () => drawer.open();
  setMain(page);
}

function viewNotFound() {
  setMain(h(`<div class="page"><h1 class="title">${esc(t('not_found'))}</h1><p><a href="#/">${esc(t('back_dashboard'))}</a></p></div>`));
}

// ─── router ──────────────────────────────────────────────────────────────────
async function route() {
  const hash = location.hash || '#/';
  const [, kind, ...rest] = hash.split('/');
  const id = decodeURIComponent(rest.join('/'));
  document.body.classList.remove('nav-open');
  closeModal();
  renderSidebar();
  try {
    switch (kind) {
      case '': case 'progress': return viewDashboard();
      case 'm': return await viewModule(id);
      case 'l': return await viewLesson(id);
      case 'e': return await viewWorkspace('exercise', id);
      case 'c': return await viewWorkspace('milestone', id);
      case 'q': return await viewQuiz(id);
      case 'capstone': return await viewCapstone();
      case 'playground': return await viewPlayground();
      case 'doc': return await viewDoc(id);
      case 'files': return await viewFiles(id);
      default: return viewNotFound();
    }
  } catch (err) {
    setMain(h(`<div class="page"><h1 class="title">${esc(t('oops'))}</h1><p>${esc(err.message)}</p><p><a href="#/">${esc(t('back_dashboard'))}</a></p></div>`));
  }
}

// ─── start ───────────────────────────────────────────────────────────────────
function setupTheme() {
  $('#theme-btn').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nextTheme = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem('studio-theme', nextTheme); } catch { /* storage unavailable */ }
  };
}

async function start() {
  S = await api('/api/state');
  t = translator(S.lang);
  translateStatic();
  setupTheme();
  setupDrawer();
  $('#menu-btn').onclick = () => document.body.classList.toggle('nav-open');
  $('#modal-close').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  await refresh(S);
  window.addEventListener('hashchange', route);
  await route();
  if (store.get('studio-drawer', false)) drawer.open();
  // Progress can change from another tab or a terminal: reload it when the page comes back.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
}
start();

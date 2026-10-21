'use strict';
// The browser Studio (skills/learn/assets/studio): syntax, translations, quiz parser,
// and its course self-check on a tiny fake course. Runtime deps (node-pty, xterm…) are not installed here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { tmpdir, write } = require('./helpers');

const STUDIO = path.join(__dirname, '..', 'skills', 'learn', 'assets', 'studio');
const load = (rel) => import(require('node:url').pathToFileURL(path.join(STUDIO, rel)).href);

test('studio JavaScript files parse', () => {
  for (const rel of ['server.js', 'quiz.js', 'public/app.js', 'public/i18n.js']) {
    const r = spawnSync(process.execPath, ['--check', path.join(STUDIO, rel)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${rel}: ${r.stderr}`);
  }
});

test('studio ships its launchers, manifest and guide', () => {
  for (const rel of ['package.json', 'studio.sh', 'studio.ps1', 'README.md', 'public/index.html', 'public/app.css']) {
    assert.ok(fs.existsSync(path.join(STUDIO, rel)), `missing ${rel}`);
  }
  assert.ok(!fs.existsSync(path.join(STUDIO, 'node_modules')), 'node_modules must not be shipped');
  const pkg = JSON.parse(fs.readFileSync(path.join(STUDIO, 'package.json'), 'utf8'));
  assert.equal(pkg.type, 'module');
  for (const dep of ['node-pty', 'ws', 'marked', 'highlight.js', '@xterm/xterm', 'codemirror']) assert.ok(pkg.dependencies[dep], dep);
});

test('every interface string exists in English and French', async () => {
  const { STRINGS, translator } = await load('public/i18n.js');
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(Object.keys(STRINGS.fr).sort(), en);
  for (const lang of Object.keys(STRINGS)) {
    const extra = Object.keys(STRINGS[lang]).filter((k) => !(k in STRINGS.en));
    assert.deepEqual(extra, [], `${lang} has keys English lacks`);
  }
  const t = translator('fr-CA');
  assert.equal(t('show_answer'), STRINGS.fr.show_answer);
  assert.equal(translator('xx')('show_answer'), STRINGS.en.show_answer);
});

test('quiz parser reads multiple-choice and open questions', async () => {
  const { parseQuizMarkdown } = await load('quiz.js');
  const src = [
    '# Quiz — Basics', '', 'Answer before opening.', '', '---', '',
    '**1.** Which one?', '', '- a) first', '- b) second', '- c) third', '',
    '<details><summary>Answer</summary>', '', '**b.** Because.', '</details>', '', '---', '',
    '**2.** What does it print?', '', '```console', '$ echo hi', '```', '',
    '<details><summary>Answer</summary>', '', '`hi`', '</details>', '',
  ].join('\n');
  const { introMd, questions } = parseQuizMarkdown(src);
  assert.match(introMd, /Quiz — Basics/);
  assert.equal(questions.length, 2);
  assert.deepEqual(questions[0].options.map((o) => o.letter), ['a', 'b', 'c']);
  assert.deepEqual(questions[0].correct, ['b']);
  assert.equal(questions[1].options.length, 0);
  assert.match(questions[1].answerMd, /hi/);

  const noSeparators = '# Quiz\n\n### 1. Pick\n- a) x\n- b) y\n<details><summary>Réponse</summary>\n\n**Réponse : a.** ok\n</details>\n';
  assert.deepEqual(parseQuizMarkdown(noSeparators).questions[0].correct, ['a']);
});

test('studio --check validates a course and reports missing pieces', () => {
  const root = tmpdir('learn-studio-');
  fs.cpSync(STUDIO, path.join(root, 'studio'), { recursive: true });
  write(path.join(root, 'tools', 'check.sh'), '#!/usr/bin/env bash\n');
  write(path.join(root, '01-basics/README.md'), '# Basics\n');
  write(path.join(root, '01-basics/lessons/01-intro.md'), '# Intro\n');
  write(path.join(root, '01-basics/exercises/01-greet/README.md'), '# Greet\n');
  write(path.join(root, '01-basics/quiz.md'), '# Quiz\n\n---\n\n**1.** Q?\n\n- a) x\n- b) y\n\n<details><summary>Answer</summary>\n\n**a.** ok\n</details>\n');
  const course = {
    params: { technology: 'Demo', slug: 'demo', lang: 'en' },
    modules: [{
      id: '01', slug: '01-basics', title: 'Basics',
      lessons: [{ id: '01-01', file: '01-basics/lessons/01-intro.md' }, { id: '01-02', file: '01-basics/lessons/02-gone.md' }],
      exercises: [{ id: '01-01', path: '01-basics/exercises/01-greet' }],
    }],
  };
  write(path.join(root, '.learn', 'course.json'), JSON.stringify(course));
  const r = spawnSync(process.execPath, [path.join(root, 'studio', 'server.js'), '--check'], { encoding: 'utf8' });
  const out = r.stdout + r.stderr;
  assert.match(out, /1 modules · 2 lessons · 1 exercises · 0 milestones · 1 quizzes \(1 questions\)/);
  assert.match(out, /lesson 01-02: 01-basics\/lessons\/02-gone\.md not found/);
  assert.match(out, /no solution folder/);
  // Only the planted lesson and the uninstalled npm deps may fail.
  const errors = out.split('\n').filter((l) => l.startsWith('✗ ') && !/npm install|error\(s\)/.test(l));
  assert.deepEqual(errors, ['✗ lesson 01-02: 01-basics/lessons/02-gone.md not found']);
  assert.equal(r.status, 1);
});

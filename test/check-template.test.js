'use strict';
// End-to-end test of the course grading templates (tools/check.sh + tools/lib.sh)
// on a tiny fake course that needs nothing but bash.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { tmpdir, write } = require('./helpers');

const TEMPLATES = path.join(__dirname, '..', 'skills', 'learn', 'assets', 'templates');
const hasBash = spawnSync('bash', ['--version']).status === 0;
const skip = process.platform === 'win32' || !hasBash;

function makeCourse() {
  const root = tmpdir('learn-course-');
  let check = fs.readFileSync(path.join(TEMPLATES, 'check.sh'), 'utf8');
  check = check
    .replace("NATIVE_TEST_GLOB='*_test.go'", "NATIVE_TEST_GLOB='*.test.sh'")
    .replace('run_native() { go test ./... 2>&1; }', 'run_native() { bash ./greet.test.sh 2>&1; }');
  write(path.join(root, 'tools', 'check.sh'), check);
  fs.copyFileSync(path.join(TEMPLATES, 'lib.sh'), path.join(root, 'tools', 'lib.sh'));

  const greetTest = 'out="$(bash ./greet.sh)"; [ "$out" = hello ] || { echo "greet printed \'$out\', expected hello"; exit 1; }\n';
  write(path.join(root, '01-basics/exercises/01-greet/greet.sh'), 'echo TODO\n');
  write(path.join(root, '01-basics/exercises/01-greet/greet.test.sh'), greetTest);
  write(path.join(root, '01-basics/solutions/01-greet/greet.sh'), 'echo hello\n');
  write(path.join(root, '01-basics/solutions/01-greet/greet.test.sh'), greetTest);

  const stateCheck =
    'source "$(cd "$(dirname "$0")/../../.." && pwd)/tools/lib.sh"\n' +
    'assert_eq "answer.txt contains 42" "42" "$(cat answer.txt 2>/dev/null)"\n' +
    'assert "answer.txt exists" test -f answer.txt\n' +
    'summary\n';
  write(path.join(root, '01-basics/exercises/02-answer/check.sh'), stateCheck);
  write(path.join(root, '01-basics/exercises/02-answer/answer.txt'), '');
  write(path.join(root, '01-basics/solutions/02-answer/check.sh'), stateCheck);
  write(path.join(root, '01-basics/solutions/02-answer/answer.txt'), '42');

  write(path.join(root, 'capstone/tests/validate-01.sh'), 'exit 0\n');
  write(path.join(root, 'capstone/tests/validate-02.sh'), 'echo "GET /health returned 500"; exit 1\n');
  return root;
}

const run = (root, ...args) =>
  spawnSync('bash', [path.join(root, 'tools', 'check.sh'), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

const log = (root) => fs.readFileSync(path.join(root, '.learn', 'results.log'), 'utf8').trim().split('\n');

test('grades all exercises, skipping solutions, and logs results', { skip }, () => {
  const root = makeCourse();
  const r = run(root);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /Total: 2/);
  assert.match(r.stdout, /expected hello/);
  assert.match(r.stdout, /✗ answer.txt contains 42/);
  assert.doesNotMatch(r.stdout, /solutions/);
  const lines = log(root);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^\d{4}-\d\d-\d\dT[\d:]+Z\t01-basics\/exercises\/01-greet\tfail$/);
});

test('grades a single exercise and a module', { skip }, () => {
  const root = makeCourse();
  const one = run(root, '01-basics/exercises/02-answer');
  assert.equal(one.status, 1);
  assert.match(one.stdout, /Total: 1/);
  fs.writeFileSync(path.join(root, '01-basics/exercises/02-answer/answer.txt'), '42');
  assert.equal(run(root, '01-basics/exercises/02-answer/').status, 0);
  assert.match(log(root).pop(), /02-answer\tpass$/);
  assert.match(run(root, '01-basics').stdout, /Passed: 1/);
});

test('solutions pass when targeted explicitly', { skip }, () => {
  const root = makeCourse();
  const r = run(root, '01-basics/solutions');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Total: 2/);
});

test('authoring mode: stubs fail and solutions pass', { skip }, () => {
  const root = makeCourse();
  const r = run(root, '--authoring');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Total: 4/);
  // a stub that accidentally passes is reported
  fs.writeFileSync(path.join(root, '01-basics/exercises/01-greet/greet.sh'), 'echo hello\n');
  const bad = run(root, '--authoring');
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /stub passes but should fail/);
});

test('capstone milestones are cumulative', { skip }, () => {
  const root = makeCourse();
  assert.equal(run(root, 'capstone', '01').status, 0);
  const r = run(root, 'capstone', '02');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /capstone\/01.*PASS/);
  assert.match(r.stdout, /GET \/health returned 500/);
});

test('unknown target exits with an error', { skip }, () => {
  assert.equal(run(makeCourse(), 'nope').status, 2);
});

test('templates are valid bash', { skip }, () => {
  for (const f of ['check.sh', 'lib.sh']) {
    const r = spawnSync('bash', ['-n', path.join(TEMPLATES, f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

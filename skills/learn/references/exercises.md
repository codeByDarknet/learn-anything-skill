# Exercises, tests and check scripts

An exercise is a small, self-contained task with an **automatic, objective** pass/fail signal. The learner edits files, runs one command, and gets precise feedback.

## Exercise folder

```
exercises/NN-<slug>/
├── README.md        # Statement
├── <stub files>     # What the learner edits
└── <tests>          # Native tests, or check.sh / check.ps1
```

### README.md (statement)

```markdown
# NN — <Title>   ★★☆

**Concepts:** <list, linking to lessons>
**Goal:** <what the finished code/system does, observable>

## Task
Precise spec: function signatures / resources to create / endpoints / expected states.
Include edge cases the tests will check (empty input, negative values, missing resource, idempotence...).

## Run the check
    ./tools/check.sh NN-module/exercises/NN-slug

## Hints
<details><summary>Hint 1</summary>Direction, not code.</details>
<details><summary>Hint 2</summary>Narrower.</details>
<details><summary>Hint 3</summary>Almost there (pseudo-code or the key API name).</details>

## Going further (optional)
A stretch variation.
```

## Exercise types (mix them in every module)

| Type | Description | Good for |
|---|---|---|
| **Implement** | Fill TODOs in stubs so tests pass | Core language/framework features |
| **Fix the bug** | Working-looking code/config with 1–3 bugs; tests reveal them | Reading code, common mistakes |
| **Refactor** | Tests already pass; make it idiomatic/faster without breaking them; a lint/bench check enforces it | Idioms, performance |
| **Predict** | Answer in `answers.md` what the program/command outputs; check compares | Mental models |
| **Build from spec** | Only a spec and tests; learner creates files | Autonomy, later modules |
| **Break & repair** (infra) | A script puts the playground in a broken state; learner diagnoses and fixes | Debugging, operations |
| **Write the tests** | Implementation given; learner writes tests; check runs mutation-style: tests must fail against provided buggy variants | Testing skills |

## Stubs

- Must **compile / parse / apply** so failures are test failures, not syntax errors (return zero values, `todo!()`, `raise NotImplementedError`, `throw new Error("TODO")`, empty YAML fields with comments).
- Contain the spec again as a comment at the top, in `lang`.
- Mark each place to edit with `TODO` (in `lang` if natural: `TODO:` stays, explanation translated).

## Tests (programming profiles)

- Use the native runner: `go test`, `cargo test`, `pytest`, `vitest`/`node --test`, JUnit via Gradle, `dart test`/`flutter test`, `dotnet test`, `mix test`, `zig build test`...
- Table-driven, one scenario per case, **failure messages in `lang` that teach**: say what was called, what was expected, what came back, and which concept is likely involved.
  - Good: `Deposit(-5) returned true; a negative amount must be refused (see lesson 05-02: validate inputs in methods)`.
  - Bad: `expected false got true`.
- Cover edge cases explicitly listed in the statement. No hidden requirements the statement doesn't mention.
- Deterministic: no network, no real time dependence (inject clocks), fixed random seeds, timeouts on concurrency tests.
- Fast: each exercise's tests run in seconds.

## Check scripts (infra, tools, cloud, data stores)

`check.sh` asserts **real state**, prints ✓/✗ per assertion with a teaching message, exits non-zero on any failure. Pattern:

```bash
#!/usr/bin/env bash
set -uo pipefail
# exercises/NN-slug/check.sh -> course root is three levels up
source "$(cd "$(dirname "$0")/../../.." && pwd)/tools/lib.sh"

assert "Deployment 'web' exists in namespace 'shop'" \
  kubectl -n shop get deploy web
assert_eq "3 replicas are ready" "3" \
  "$(kubectl -n shop get deploy web -o jsonpath='{.status.readyReplicas}')"
assert "The Service routes to the pods (HTTP 200 through port-forward)" \
  curl -fsS --max-time 5 http://localhost:8080/healthz
summary
```

`tools/lib.sh` (generated from `assets/templates/lib.sh`) provides `assert`, `assert_eq`, `assert_contains`, `summary`. Also offer:
- `setup.sh` when the exercise needs a starting state (e.g. create a broken deployment) — idempotent.
- `reset.sh` to return to a clean state.
- Static checks when state is hard to reach: `kubeconform`, `hadolint`, `terraform validate` + `terraform plan -detailed-exitcode`, `ansible-lint`, `docker compose config`, `yamllint`, `shellcheck`.
- Queries for data stores: run the learner's `query.sql` and compare to `expected.tsv` (order-insensitive unless ORDER BY is required).

Always make checks **idempotent** and **non-destructive** outside the playground namespace/project/containers they own (prefix resources with `learn-`).

## Solutions

`solutions/NN-<slug>/` mirrors the exercise, fully working, idiomatic, with a `NOTES.md` (in `lang`): the key idea, alternative approaches and their trade-offs, the mistake most people make. Solutions are excluded from normal checks (`tools/check.sh` skips `solutions/` unless targeted explicitly).

## Verification (authoring mode) — mandatory before hand-off

Run for every exercise:

1. The stub fails its check (exit code ≠ 0) **for the right reason** (a test assertion, not a compile error). For infra exercises, run against a fresh playground state.
2. The solution passes: copy/overlay solution files into a temp copy of the exercise (or run the check pointed at `solutions/`) → exit code 0.
3. Formatter/linter clean on solutions (`gofmt -l`, `cargo fmt --check`, `ruff`, `prettier --check`, `dart format`...).

`tools/check.sh --authoring` implements steps 1–2 generically: for each exercise it runs the check on the stub (expects failure), then on the matching solution (expects success), and prints a table. Fix and re-run until clean. If a tool is missing so a check could not run, record it in `course.json.verification.skipped` with the reason and tell the learner.

## Difficulty stars

★☆☆ direct application of one lesson · ★★☆ combines 2–3 concepts or edge cases · ★★★ open design, performance or debugging. Each module: at least one of each once past module 01.

# Course structure

A course is a plain folder. It must be understandable without any AI: a learner who opens it in an editor can read, code, run checks and track progress by themselves.

## Layout

```
learn-<slug>/
├── README.md                 # Course home: promise, audience, roadmap, how to work
├── SETUP.md                  # Tools to install per OS + verification commands
├── PROGRESS.md               # Human-readable checklist (regenerated from .learn/)
├── .gitignore
├── .learn/
│   ├── course.json           # Manifest: parameters, modules, exercises, generation state
│   ├── progress.json         # Learner state: completed lessons, exercise results, quiz scores
│   └── results.log           # Append-only log written by tools/check.* (TSV)
├── tools/
│   ├── check.sh              # Grade one exercise, a module, the capstone, or everything
│   ├── check.ps1             # Same for native Windows PowerShell
│   └── README.md             # How grading works
├── playground/
│   └── README.md             # What is here and how to experiment safely (+ compose files, configs, data)
├── 00-<intro-slug>/
│   ├── README.md             # Objectives, lesson plan, exercise table, milestone link
│   ├── lessons/
│   │   ├── 01-<slug>.md
│   │   └── 02-<slug>.md
│   ├── exercises/
│   │   └── 01-<slug>/        # One self-contained unit per exercise
│   │       ├── README.md     # Statement, concepts, how to run the check, bonus
│   │       ├── <stub files>  # With TODOs — the learner edits these
│   │       └── <tests or check script>
│   ├── solutions/
│   │   └── 01-<slug>/        # Same shape as the exercise, completed + short "why" notes
│   └── quiz.md               # 8–15 questions, answers in collapsible <details>
├── 01-<slug>/ ...
├── NN-<slug>/ ...
└── capstone/
    ├── README.md             # Product vision, user stories, architecture, milestone map
    ├── milestones/
    │   ├── 01-<slug>.md      # Goal, spec, acceptance criteria, hints, stretch goals
    │   └── ...
    ├── starter/              # Skeleton the learner builds on (or `app/`, idiomatic name)
    ├── reference/            # Optional reference implementation, one tag/folder per milestone
    └── tests/                # Acceptance tests / validate scripts per milestone
```

Numbering is two digits, zero-padded, starting at `00`. Module folders sort in learning order.

## Ecosystem-specific adjustments

Keep the generic layout but respect the ecosystem's constraints so tools work out of the box:

- **Go:** one `go.mod` at the course root (`module learn-go`), each exercise is its own package; tests in `*_test.go`.
- **Rust:** a Cargo workspace at the root; each exercise is a crate member (`exercises/01-x` as `[package]`), tests in `tests/` or `#[cfg(test)]`. Solutions in a separate workspace (or excluded) so names don't collide.
- **Python:** `pyproject.toml` at the root with pytest config; `exercises/01-x/solution.py` + `test_solution.py`; a `.venv` created in SETUP; solutions excluded by `pytest.ini` `--ignore`.
- **JS/TS:** root `package.json` with vitest (or node:test for zero-dep); each exercise has `index.ts` + `index.test.ts`; `tsconfig.json` at root.
- **Java/Kotlin:** Gradle multi-project or one project with packages per exercise; JUnit 5.
- **Dart/Flutter:** exercises for pure Dart are a `dart` package with `test/`; Flutter modules build on one app in `capstone/app` plus small widget-test exercises in their own packages.
- **C/C++:** a Makefile or CMake per exercise, tests with a tiny header-only framework you generate (no external dependency) or plain `assert` + exit codes.
- **Infra/tools:** each exercise folder contains `README.md`, the files to write or fix, and `check.sh` (+ `check.ps1` when it makes sense) that asserts real state.

The grading entry point is always `tools/check.sh`; it dispatches to the native test runner or to the exercise's `check.sh`.

## Root README.md must contain

1. One-sentence promise ("By the end you will have built X and understand Y").
2. Who it is for and prerequisites.
3. Roadmap table: module, what you learn, capstone milestone, estimated time.
4. How to work (loop: read lesson → do exercise → run check → compare with solution → quiz → milestone).
5. How grading works (exact commands).
6. How to get help from an AI agent (`/learn hint`, `/learn explain`, `/learn status`) — optional, the course works without it.
7. Conventions (language, code style, formatter).

## SETUP.md must contain

- Exact tool versions targeted and why.
- Installation per OS (macOS, Linux distros families, Windows native and/or WSL) using official installers or package managers.
- Editor setup (extensions, formatter on save).
- A "verify your setup" block with commands and expected output.
- Playground bootstrap (e.g. `kind create cluster --config playground/kind.yaml`) and teardown.
- Troubleshooting for the 3–5 most common install problems.

## .gitignore

Ignore build outputs, dependency folders, virtualenvs, local secrets (`.env`), editor folders, and playground state (volumes, kubeconfigs generated locally). Never ignore `.learn/`.

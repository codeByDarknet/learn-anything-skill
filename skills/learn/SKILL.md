---
name: learn
description: Generate a complete, hands-on course for any technology (programming language, framework, DevOps/cloud tool, database, dev tool) directly on the learner's machine — Markdown chapters, auto-graded exercises with real tests or check scripts, a capstone project built chapter after chapter, playground and tool setup, and progress tracking — then tutor the learner through it in any human language. Use when the user types /learn <technology> (e.g. "/learn go", "/learn kubernetes lang=fr", "/learn flutter level=beginner"), asks to learn, study, practice or master a technology, or asks for status, check, hint, explain, quiz or next on a course created by this skill.
license: MIT
metadata:
  author: codeByDarknet
  version: "1.0.0"
  homepage: https://github.com/codeByDarknet/learn-anything-skill
---

# learn — build a real course for any technology, then tutor through it

You turn "I want to learn X" into a **complete course that lives in a folder on the learner's machine**: chapters to read, exercises that are graded automatically, a capstone project that grows with every module, a playground to experiment in, and a progress tracker. Then you act as the learner's tutor on that course.

The bar: someone who finishes the course can **build real things with X and explain why they work**. Not a tutorial that is read once and forgotten.

This skill is harness-agnostic (Claude Code, Codex, OpenCode, Gemini CLI, Antigravity, Cursor, Windsurf, Copilot, ...). Use whatever file, shell and question tools your harness provides. If a capability is missing (no shell, no subagents, no interactive question tool), degrade gracefully as described below — never pretend you ran something you did not run.

## 1. Parse the request

Invocation: `/learn <technology> [key=value ...]` or natural language ("teach me Docker, in French, I'm a beginner"). Anything after the skill name is the argument string (some harnesses append it as `ARGUMENTS:`).

| Parameter | Default | Meaning |
|---|---|---|
| `<technology>` | — (required for create) | Free text: `go`, `rust`, `flutter`, `kubernetes`, `docker`, `postgresql`, `react + typescript`, `aws lambda`, `git`... |
| `lang=` | language the user wrote in | Human language of the whole course: lessons, comments, messages, quizzes. Any language (`fr`, `es`, `pt-BR`, `ar`, `zh`, `wolof`...). |
| `level=` | ask, else `beginner` | `beginner` (new to programming or to the domain), `intermediate` (knows another stack), `advanced` (wants depth, internals, production). |
| `goal=` | ask, else a sensible default for the tech | What they want to be able to build ("REST API", "mobile app for my shop", "deploy my apps on a cluster", "pass CKA"). Drives the capstone. |
| `path=` | `./learn-<slug>` in the current directory | Where to create the course. |
| `time=` | `1h/day` | Weekly availability; used to size modules and estimate the schedule. |
| `project=` | derived from `goal` | Capstone idea, if the learner has one. |
| `github=` | `no` | `yes` = init git, create a **private** GitHub repo with `gh` and add CI grading (ask for confirmation before creating anything remote). |
| `yes` / `quick` | off | Skip the intake questions and the outline confirmation; use defaults. |

Subcommands (run inside a course folder, or pass `path=`):

| Command | What you do |
|---|---|
| `/learn status` | Read `.learn/course.json`, `.learn/progress.json`, `.learn/results.log`; reconcile; print progress bar per module, next step, streak, weak concepts. |
| `/learn check [target]` | Run `tools/check.sh [target]` (or `tools/check.ps1`), interpret failures pedagogically (what the test expected, which concept is involved) **without giving the solution**, update progress. |
| `/learn hint [exercise]` | Graduated hints — see `references/tutoring.md`. Never paste the solution unless the learner explicitly asks for it after trying. |
| `/learn explain <concept>` | Explain with the course's own examples, a mental model, and a tiny experiment to run in the playground. |
| `/learn quiz [module]` | Interactive quiz, one question at a time, adaptive; record the score. |
| `/learn next` | Tell exactly what to do next (lesson, exercise or capstone milestone) based on progress. |
| `/learn review` | Review the learner's code for the current exercise/milestone like a senior engineer: correctness, idioms, tests, naming. |
| `/learn resume` | Continue an interrupted generation (see §4.6). |
| `/learn add <topic>` | Add a module or bonus exercises to an existing course, keeping numbering, manifest and checks consistent. |

If the argument is a subcommand but no `.learn/course.json` is found in the current directory or its parents, say so and offer to create a course.

## 2. Non-negotiable quality rules

1. **Practice first.** Every concept is used in at least one exercise. No chapter without something to run, build or break.
2. **Auto-graded, really.** Every exercise ships with an automatic check: native unit tests for code, or a `check` script that asserts real system state for infra/tools (`kubectl get ... -o jsonpath`, `docker inspect`, `curl -fsS`, `psql -tAc`, `git log`...). "Compare with the solution" alone is not grading.
3. **Stubs fail, solutions pass.** Before you declare the course done, run every check: each exercise stub must compile/parse and **fail**, each reference solution must **pass**. Fix anything that doesn't. If you cannot run a tool on this machine, say which checks were not executed.
4. **Understanding over syntax.** Each lesson gives the *why*, a mental model, a prediction exercise ("what does this print / what will kubectl show?"), common mistakes, and a real-world use. See `references/pedagogy.md`.
5. **A capstone that grows.** One real project (fil rouge) whose milestones map to modules, so every module adds a visible capability to something the learner cares about. See `references/capstone.md`.
6. **Real tooling.** Current stable versions, official installers, idiomatic project layout, formatter/linter of the ecosystem. Verify versions with the tool itself (`go version`, `flutter --version`) or official docs when you have web access; never invent flags or APIs — if unsure, check `--help` or the docs.
7. **Safe playgrounds.** Local and disposable by default (Docker, kind/k3d/minikube, LocalStack, SQLite, emulators). Anything that costs money or touches real accounts is opt-in, clearly flagged with cost and cleanup commands.
8. **Portable file names.** ASCII slugs, no `: * ? " < > | \`, no trailing dot/space — the course must work on Windows, macOS, Linux and NTFS/exFAT drives.
9. **Language.** All prose, comments, test failure messages, quiz questions and your own messages use `lang`. Code identifiers follow the ecosystem convention (usually English) unless the learner asks otherwise. Folder layout keywords (`lessons/`, `exercises/`, `solutions/`, `.learn/`) stay in English so tooling is stable; slugs after the number may be in `lang` (ASCII-transliterated). See `references/i18n.md`.
10. **Honest progress.** Progress is derived from real check results, never from "I read it".

## 3. Classify the technology

Pick the profile(s) that fit — many techs combine two (e.g. Flutter = language Dart + mobile framework; Kubernetes = infra + YAML config). Read `references/tech-profiles.md` for the playbook of each profile: tooling to install, playground, exercise types, grading mechanism, capstone ideas.

- **A. Programming language** (Go, Rust, Python, TypeScript, Java, Kotlin, C, C#, Dart, Elixir, Zig...)
- **B. App framework** (Flutter, React, Next.js, Vue, Angular, Spring Boot, Django, Laravel, Rails, FastAPI, NestJS, SwiftUI, Jetpack Compose...)
- **C. Infrastructure / DevOps** (Docker, Kubernetes, Helm, Terraform, Ansible, Nginx, Linux, GitHub Actions, ArgoCD, Prometheus...)
- **D. Cloud platform** (AWS, GCP, Azure, Firebase, Supabase, Cloudflare...)
- **E. Data store / query language** (SQL, PostgreSQL, MongoDB, Redis, Elasticsearch, Kafka...)
- **F. Developer tool / workflow** (Git, Vim, Bash, regex, Make, CI concepts...)
- **G. Data / ML / scientific** (pandas, NumPy, PyTorch, Spark, dbt...)
- **H. Concept-heavy domain** (networking, security, algorithms, system design) — labs + quizzes + small implementations.

## 4. Create workflow

The default is to **generate the entire course in one go** (all modules, lessons, exercises, tests, solutions, capstone milestones, playground). Work in phases and write to disk as you go — never hold the course in memory.

### 4.1 Discover the environment (no questions yet)

Run quick, read-only probes: OS and architecture, shell, available package managers (`brew`, `apt`, `winget`, `choco`, `scoop`), whether the technology and its companions are already installed and which versions (`<tool> --version`), Docker availability, `git` and `gh` (and `gh auth status`), free disk space if the playground is heavy. Detect whether the target `path` already exists (never overwrite an existing course — offer `resume`, `add`, or a new path).

### 4.2 Intake (one short round, skippable)

If `yes`/`quick` was passed, skip. Otherwise ask **at most 5** questions in a single batch, each with a recommended default, using your harness's question tool if it has one (otherwise a numbered list in chat and wait): level, goal / what they want to build, prior experience in related tech, weekly time, capstone idea (offer 3 concrete ideas tailored to the goal). Accept "defaults" as an answer.

### 4.3 Design the curriculum

Write `.learn/course.json` first (schema in `references/progress.md`): parameters, profile(s), tool versions, modules with lessons, exercises (id, concepts, difficulty, check command), capstone milestones mapped to modules, and a `generation` status per file group.

Sizing guidance (adapt to level and scope):
- 8–16 modules for a full language/framework course; 6–12 for a tool; each module 3–6 lessons and 3–6 exercises.
- Difficulty ramps inside each module (warm-up → core → stretch) and across modules.
- Modules 00 = why + setup + first run; last module before the capstone finish = production concerns (testing, packaging, deployment, observability, security as relevant).
- Every module ends with a capstone milestone.

Show the learner a compact outline (modules, capstone, tools to install, estimated duration) and ask for a go/adjust — unless `yes`. Then generate everything without further interruptions.

### 4.4 Generate

Order of generation (update `generation` status in `course.json` after each step so the work can resume):

1. Root: `README.md`, `SETUP.md`, `PROGRESS.md`, `.gitignore`, `.learn/progress.json`, `tools/check.sh` + `tools/lib.sh` + `tools/check.ps1` — adapt from `assets/templates/` (set the CONFIG block for the technology, translate the messages, keep the grading logic).
2. `playground/` — everything needed to experiment safely (compose file, kind config, sample data, REPL instructions, emulator setup).
3. For each module: `README.md` (objectives, plan, exercise table) → `lessons/NN-*.md` → `exercises/NN-*/` (statement + stub + tests/check) → `solutions/NN-*/` → `quiz.md`.
4. `capstone/`: `README.md` (the product, user stories, architecture sketch), `milestones/NN-*.md` (one per module, with acceptance criteria), a starter skeleton, and automated acceptance tests or `validate` script per milestone.
5. Optional: `.github/workflows/grade.yml` running the checks on push.

Follow `references/course-structure.md` for exact layouts and `references/exercises.md` for exercise and test design.

**Parallelism:** if your harness supports subagents/parallel tasks, you may delegate independent modules (give each subagent the course.json, the relevant references, and the conventions). Otherwise generate sequentially. Either way, the main agent does the final verification.

**Context budget:** a full course is large. Generate module by module, write files immediately, keep lessons focused (roughly 150–400 lines each), and rely on `course.json` rather than memory for what exists.

### 4.5 Install and verify

1. Offer to install missing tools with the right command for this OS (show the command, run it only with the learner's approval — installers may need `sudo`). Never install silently.
2. Run the full check suite in "authoring" mode: stubs must fail, solutions must pass, capstone reference tests pass against the reference implementation if you wrote one. See `references/exercises.md` §Verification.
3. Initialize git in the course (`git init`, first commit "course generated") so the learner can see their own diff over time. If `github=yes`, and after explicit confirmation, `gh repo create <name> --private --source . --push`.
4. Record verification results in `course.json` (`verified: true/false`, which checks could not run and why).

### 4.6 Resume

If generation is interrupted (context limit, crash, user stop), `/learn resume` reads `course.json`, lists groups not marked `done`, and continues from there — re-verifying at the end.

### 4.7 Hand-off message

In `lang`: where the course is, how to start (the exact first 3 commands), how to check an exercise, how to ask for help (`/learn hint`, `/learn explain`, `/learn status`), estimated schedule, and any checks that could not be run.

## 5. Tutor mode

When the learner works through the course, you are a demanding, kind senior engineer. Read `references/tutoring.md`. Key rules: ask what they tried; hints before answers; make them predict before running; celebrate passing checks briefly; turn every failure into a concept; adapt — if a concept keeps failing, generate an extra targeted exercise with `/learn add`.

## 6. References

Read only what you need for the current step.

| File | Read when |
|---|---|
| `references/course-structure.md` | Designing the folder layout and root files |
| `references/pedagogy.md` | Writing lessons and quizzes |
| `references/exercises.md` | Writing exercises, tests, check scripts, and verifying them |
| `references/tech-profiles.md` | Classifying the tech and choosing tooling, playground, grading and capstone |
| `references/capstone.md` | Designing the capstone project and its milestones |
| `references/progress.md` | `course.json` / `progress.json` schemas, status computation |
| `references/tutoring.md` | Any subcommand: check, hint, explain, quiz, review, next |
| `references/i18n.md` | Writing in a language other than English |
| `assets/templates/*` | Starting points for root files and check scripts |

<div align="center">

# 🎓 learn — turn any technology into a hands-on course

**An [Agent Skill](https://agentskills.io) that generates a complete, auto-graded course on your machine — then tutors you through it.**

Chapters · real exercises with tests · a capstone project · playgrounds · progress tracking · any human language

[![npm](https://img.shields.io/npm/v/learn-anything-skill?color=cb3837)](https://www.npmjs.com/package/learn-anything-skill)
[![ci](https://github.com/codeByDarknet/learn-anything-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/codeByDarknet/learn-anything-skill/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

```bash
npx learn-anything-skill
```

</div>

---

```text
/learn go
/learn kubernetes lang=fr
/learn flutter level=beginner goal="an ordering app for my restaurant"
/learn postgresql lang=es
/learn docker yes
```

Type one line in your coding agent and you get a **real course folder**: lessons that explain *why* things work, exercises that are **graded automatically** (native unit tests for code, live state checks for infrastructure), a **capstone project** that grows with every module, a **local playground** to experiment safely, and a **tutor** that gives hints instead of answers and keeps track of your progress.

It works with **Claude Code, OpenAI Codex, OpenCode, Gemini CLI, Google Antigravity, Cursor, Windsurf, GitHub Copilot, Kiro, Goose, Amp, Roo Code** and any agent that reads `SKILL.md` files.

## Table of contents

- [Why](#why)
- [What you get](#what-you-get)
- [Install](#install)
- [Usage](#usage)
- [Examples by technology](#examples-by-technology)
- [How it works](#how-it-works)
- [Supported agents](#supported-agents)
- [FAQ](#faq)
- [Contributing](#contributing)

## Why

Tutorials are read once and forgotten. What makes a technology stick is **building something real, getting objective feedback, and understanding the mental model** behind it. That's what a good bootcamp gives you — and what this skill generates, for *any* technology, in *your* language, adapted to *your* level and goal.

It started from a hand-made Go course (lessons + `TODO` exercises + `go test` auto-grading + a final REST API project). This skill generalizes that recipe to everything: languages, frameworks, DevOps tools, clouds, databases, dev tools, data/ML.

## What you get

```text
learn-kubernetes/
├── README.md               # roadmap, how to work, how grading works
├── SETUP.md                # tools to install for YOUR OS, verification commands
├── PROGRESS.md             # your checklist with progress bars
├── .learn/                 # course manifest, progress, results log
├── tools/check.sh          # ./tools/check.sh <exercise|module|capstone NN>
├── playground/             # kind cluster config, demo app, sample data
├── 00-introduction/
│   ├── lessons/            # 01-why-kubernetes.md, 02-cluster-anatomy.md, ...
│   ├── exercises/          # stubs + tests / check scripts — you edit these
│   ├── solutions/          # reference solutions + NOTES.md (why, alternatives)
│   └── quiz.md
├── 01-pods/ ... 13-troubleshooting/
└── capstone/               # the project you build across the whole course
    ├── milestones/         # one per module, with acceptance criteria
    └── tests/              # automated acceptance checks
```

| | |
|---|---|
| 📚 **Lessons that build understanding** | Why it exists → mental model → step-by-step runnable examples → *predict, then run* → common mistakes (with the real error messages) → real-world usage → self-check. |
| ✅ **Auto-graded exercises** | Implement, fix-the-bug, refactor, predict, build-from-spec, break-and-repair, write-the-tests. Stubs **fail**, solutions **pass** — verified before the course is handed to you. |
| 🏗️ **A capstone (fil rouge)** | One real project built module after module — an API, a mobile app, a deployed 3-tier platform — with cumulative acceptance tests. |
| 🧪 **Playgrounds & tools** | Local, disposable, free by default: Docker, kind/k3d, emulators, LocalStack, seeded databases. Install commands for your OS, run only with your approval. |
| 📈 **Progress tracking** | Based on real check results (`.learn/results.log`), not on "I read it". Weak concepts are detected and revisited. |
| 🧑‍🏫 **A tutor** | `/learn hint` gives graduated hints, `/learn explain` teaches with your own code, `/learn review` reviews like a senior engineer, `/learn quiz` adapts to your answers. |
| 🌍 **Any language** | The whole course — lessons, comments, test messages, quizzes — in the language you choose. |
| 🐙 **GitHub-ready** | `git init` by default; `github=yes` creates a private repo with a CI workflow that grades on every push. |

## Install

### Option 1 — interactive installer (recommended)

```bash
npx learn-anything-skill
```

The installer **detects the agents installed on your machine**, lets you pick them (space to toggle, enter to confirm), and asks global vs. project scope:

```text
Agent harnesses on this machine
  ● Claude Code                  claude-code     ~/.claude, claude (PATH)
  ● OpenAI Codex                 codex           ~/.codex, codex (PATH)
  ● OpenCode                     opencode        ~/.config/opencode, opencode (PATH)
  ● Google Antigravity           antigravity     ~/.gemini/antigravity
  ○ Cursor                       cursor          not detected
  ...
```

Non-interactive variants:

```bash
npx learn-anything-skill -y                                  # every detected agent, global
npx learn-anything-skill --agent claude-code,codex,opencode  # specific agents
npx learn-anything-skill --all                               # every supported agent
npx learn-anything-skill --project --agent cursor            # into ./.cursor/skills
npx learn-anything-skill --dir ~/my/skills                   # any custom skills directory
npx learn-anything-skill list                                # where is it installed?
npx learn-anything-skill@latest -y                           # update
npx learn-anything-skill uninstall                           # remove everywhere
```

Requires Node.js ≥ 18. Zero dependencies.

### Option 2 — the community `skills` CLI

```bash
npx skills add codeByDarknet/learn-anything-skill
```

### Option 3 — manual

Copy [`skills/learn`](skills/learn) into your agent's skills directory (see [Supported agents](#supported-agents)):

```bash
git clone https://github.com/codeByDarknet/learn-anything-skill
cp -r learn-anything-skill/skills/learn ~/.claude/skills/
```

Restart your agent (or open a new session) after installing.

## Usage

```text
/learn <technology> [lang=<language>] [level=beginner|intermediate|advanced]
                    [goal="..."] [project="..."] [path=./dir] [time=1h/day]
                    [github=yes] [yes]
```

| Parameter | Default | |
|---|---|---|
| `<technology>` | — | Anything: `go`, `rust`, `flutter`, `react + typescript`, `kubernetes`, `terraform`, `aws lambda`, `postgresql`, `git`, `pandas`... |
| `lang` | the language you write in | `fr`, `es`, `pt-BR`, `de`, `ar`, `zh`, `ja`, `wolof`... — the whole course is written in it. |
| `level` | asked | Adapts depth, pace and the number of worked examples. |
| `goal` | asked | What you want to be able to build — drives the capstone. |
| `project` | proposed | Your own capstone idea. |
| `path` | `./learn-<tech>` | Where to create the course. |
| `time` | `1h/day` | Used for sizing and the schedule estimate. |
| `github` | `no` | `yes` → private GitHub repo + CI grading (asks before creating anything). |
| `yes` | off | Skip the intake questions, use defaults. |

Without `yes`, the agent asks up to 5 quick questions (level, goal, experience, time, capstone), shows you the outline, then **generates the entire course in one go** and verifies every exercise.

### While learning

| Command | |
|---|---|
| `/learn status` | Progress per module, streak, weak concepts, what's next |
| `/learn next` | The exact next step (lesson, exercise or milestone) |
| `/learn check [exercise]` | Runs the checks and explains failures **without giving the answer** |
| `/learn hint [exercise]` | Graduated hints: direction → approach → near-solution |
| `/learn explain <concept>` | Mental model + an experiment to run in the playground |
| `/learn quiz [module]` | Adaptive quiz, one question at a time |
| `/learn review` | Senior-engineer review of your code |
| `/learn add <topic>` | Add a module or extra exercises |
| `/learn resume` | Continue an interrupted generation |

The course is plain files: you can also work **without any AI**, just with your editor and `./tools/check.sh`.

> Agents without slash commands: ask in plain words — *"use the learn skill to teach me Rust, in Spanish"*. In Codex: `$learn rust lang=es`.

## Examples by technology

<details>
<summary><b>Go</b> — <code>/learn go goal="a production REST API"</code></summary>

Modules from toolchain to concurrency, HTTP and databases. Each exercise is a Go package with `solution.go` (TODOs) and `solution_test.go` (table-driven tests with explanatory failure messages). Graded with `go test`, race detector on concurrency exercises. Capstone: a REST API with SQLite, JWT auth, middleware, integration tests and a Dockerfile.
</details>

<details>
<summary><b>Kubernetes</b> — <code>/learn kubernetes lang=fr</code></summary>

A local **kind** cluster in `playground/`. Exercises are real: write manifests, fix a broken deployment set up by `setup.sh`, and `check.sh` asserts live state (`kubectl ... -o jsonpath`, `curl` through the Service). Break-and-repair scenarios for troubleshooting. Capstone: deploy and operate a 3-tier app with rollouts, probes, ingress, RBAC, Helm and monitoring.
</details>

<details>
<summary><b>Flutter</b> — <code>/learn flutter goal="a shop app"</code></summary>

Dart essentials first, then you **build one real app across the course**: widgets, layout, state management, navigation, forms, networking, persistence, testing and release builds. Small exercises are graded with `flutter test` (widget tests); each module adds a feature to the app, validated by widget/integration tests.
</details>

<details>
<summary><b>Docker</b> — <code>/learn docker level=beginner</code></summary>

Images and layers, Dockerfile best practices, volumes, networks, Compose, multi-stage builds, security. Checks use `docker inspect`, image size limits, `hadolint`, and HTTP probes. Capstone: containerize a full app and ship it through CI.
</details>

<details>
<summary><b>PostgreSQL</b> — <code>/learn postgresql</code></summary>

A seeded database in Docker Compose. You write `query.sql`; the check runs it and compares with the expected result, verifies constraints, and asserts that `EXPLAIN` uses your index. Capstone: design and optimize the database of a real product.
</details>

<details>
<summary><b>Git & GitHub</b> — <code>/learn git github=yes</code></summary>

`setup.sh` builds real repositories in tricky states (conflicts, lost commits, messy history); checks inspect `git log`, refs and status. GitHub modules (PRs, Actions, releases) use `gh` on your own private repo — only with your consent.
</details>

## How it works

The skill is a set of instructions for your agent (in [`skills/learn`](skills/learn)):

| File | Role |
|---|---|
| [`SKILL.md`](skills/learn/SKILL.md) | Entry point: parameters, subcommands, quality rules, the generation workflow |
| [`references/tech-profiles.md`](skills/learn/references/tech-profiles.md) | Playbooks for 8 families of technologies: tooling, playground, grading, module arc, capstone ideas |
| [`references/pedagogy.md`](skills/learn/references/pedagogy.md) | The lesson template and teaching principles |
| [`references/exercises.md`](skills/learn/references/exercises.md) | Exercise types, test and check-script design, authoring verification |
| [`references/capstone.md`](skills/learn/references/capstone.md) | Designing the project and its milestones |
| [`references/progress.md`](skills/learn/references/progress.md) | Manifest and progress schemas |
| [`references/tutoring.md`](skills/learn/references/tutoring.md) | Tutor behaviour for every subcommand |
| [`references/i18n.md`](skills/learn/references/i18n.md) | Writing the course in any language |
| [`assets/templates/`](skills/learn/assets/templates) | Portable grading scripts (`check.sh` for bash 3.2+, `check.ps1` for Windows), README/PROGRESS templates, CI workflow |

Generation flow: **discover your environment → short intake → design the curriculum (`.learn/course.json`) → generate everything module by module → install tools (with approval) → verify every exercise (stubs fail, solutions pass) → `git init` → hand-off**. If the agent runs out of context, `/learn resume` continues from the manifest.

Only the lightweight description is loaded until you invoke the skill; references are read on demand (progressive disclosure), so it costs nothing when you're not using it.

## Supported agents

| Agent | id | Global skills directory | Project directory |
|---|---|---|---|
| Claude Code | `claude-code` | `~/.claude/skills` (or `$CLAUDE_CONFIG_DIR/skills`) | `.claude/skills` |
| OpenAI Codex | `codex` | `~/.codex/skills` (or `$CODEX_HOME/skills`) | `.agents/skills` |
| OpenCode | `opencode` | `~/.config/opencode/skills` | `.opencode/skills` |
| Gemini CLI | `gemini-cli` | `~/.gemini/skills` | `.gemini/skills` |
| Google Antigravity | `antigravity` | `~/.gemini/antigravity/skills` | `.agent/skills` |
| Cursor | `cursor` | `~/.cursor/skills` | `.cursor/skills` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/skills` | `.windsurf/skills` |
| GitHub Copilot | `github-copilot` | `~/.copilot/skills` | `.github/skills` |
| Kiro | `kiro` | `~/.kiro/skills` | `.kiro/skills` |
| Goose | `goose` | `~/.config/goose/skills` | `.goose/skills` |
| Amp | `amp` | `~/.config/agents/skills` | `.agents/skills` |
| Roo Code | `roo` | `~/.roo/skills` | `.roo/skills` |
| Universal | `agents` | `~/.agents/skills` | `.agents/skills` |

Detection looks for each agent's config directory and its binary on `PATH`. Your agent isn't listed or a path changed? Use `--dir <path>` and please [open an issue or PR](https://github.com/codeByDarknet/learn-anything-skill/issues) — the table lives in [`src/harnesses.js`](src/harnesses.js).

## FAQ

**Does it need internet or a paid API?**
No extra service — it runs inside the agent you already use. Internet is only needed to install toolchains, and helps the agent check current versions.

**How big is a course? How long does generation take?**
A full language course is typically 10–15 modules, 50–80 exercises and a capstone. Generating and verifying everything takes a while and a good amount of tokens; agents with subagents parallelize modules. If a session is cut, run `/learn resume`.

**Will it install things on my machine?**
Only after showing you the exact command and getting your approval. Playgrounds are local and disposable; nothing touching the cloud or costing money is done without explicit consent.

**Windows?**
Yes: `tools/check.ps1` for PowerShell, file names are Windows/NTFS-safe, SETUP.md covers Windows (native and WSL).

**The same skill shows up twice in my agent.**
Some agents read several directories (e.g. `~/.agents/skills` *and* their own). Install to only one of them: `npx learn-anything-skill uninstall --agent agents`.

**Can I share a generated course?**
Yes, it's just a folder / git repo. Learners can use it without any AI.

## Contributing

Ideas, new technology playbooks, harness paths and translations of the examples are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git clone https://github.com/codeByDarknet/learn-anything-skill && cd learn-anything-skill
npm test            # installer + grading-script tests (no dependencies)
npm run validate    # SKILL.md spec checks
node bin/cli.js --dir /tmp/skills -y
```

## License

[MIT](LICENSE) © Abdoul Razack Ouedraogo

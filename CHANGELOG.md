# Changelog

## 1.1.0 — 2026-10-21

- **Browser Studio** (`assets/studio/`): the whole course in a local web page — dashboard with "Continue", lessons with copy/run-in-terminal on every command block, exercises with a real terminal (node-pty + xterm.js), a file editor with autosave (CodeMirror), one-click setup/check/reset/solution, graduated hints, clickable scored quizzes, capstone milestones, playground, live progress (`PROGRESS.md`, `.learn/progress.json`). English and French UI, other languages added by the agent. Listens on `127.0.0.1` with Host/Origin checks.
- The skill now asks where the learner wants to learn (browser Studio or editor + terminal); new `studio=` parameter and `/learn studio [start|stop|service|remove]` subcommand, which also adds the Studio to existing courses.
- `node studio/server.js --check` validates a course against what the Studio reads (files, quizzes, milestones) and is part of the verification step.
- Launchers `studio.sh` (Linux/macOS, auto-start via systemd user unit or LaunchAgent) and `studio.ps1` (Windows, Startup-folder shortcut).
- New `references/studio.md`; documented quiz file format (`pedagogy.md`), `capstone.dir`, `studio` and quiz `missed`/`best`/`attempts` fields (`progress.md`).

## 1.0.0 — 2026-09-29

- First release of the `learn` skill: full course generation for any technology (lessons, auto-graded exercises, solutions, quizzes, capstone with cumulative acceptance checks, playground, SETUP per OS), progress tracking, tutor subcommands (`status`, `next`, `check`, `hint`, `explain`, `quiz`, `review`, `add`, `resume`), any human language.
- Portable grading templates: `check.sh` (bash 3.2+), `lib.sh` assertions, `check.ps1` (PowerShell), authoring mode verifying stubs fail and solutions pass.
- `npx learn-anything-skill` installer: detects 13 agent harnesses, interactive multi-select, global/project scope, custom dirs, update, uninstall, list, dry run. Zero dependencies.

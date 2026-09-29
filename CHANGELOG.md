# Changelog

## 1.0.0 — 2026-09-29

- First release of the `learn` skill: full course generation for any technology (lessons, auto-graded exercises, solutions, quizzes, capstone with cumulative acceptance checks, playground, SETUP per OS), progress tracking, tutor subcommands (`status`, `next`, `check`, `hint`, `explain`, `quiz`, `review`, `add`, `resume`), any human language.
- Portable grading templates: `check.sh` (bash 3.2+), `lib.sh` assertions, `check.ps1` (PowerShell), authoring mode verifying stubs fail and solutions pass.
- `npx learn-anything-skill` installer: detects 13 agent harnesses, interactive multi-select, global/project scope, custom dirs, update, uninstall, list, dry run. Zero dependencies.

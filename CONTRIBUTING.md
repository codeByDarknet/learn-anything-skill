# Contributing

Thanks for helping make `learn` better!

## Ways to help

- **Technology playbooks** — improve `skills/learn/references/tech-profiles.md` for a stack you know well: the right tools, a safe playground, how to grade exercises automatically, a good module arc, capstone ideas.
- **Harness support** — add or fix an agent in `src/harnesses.js` (global dir, project dir, detection) with a link to its documentation, plus a test in `test/harnesses.test.js`.
- **Grading scripts** — `skills/learn/assets/templates/` must stay portable (bash 3.2 for macOS, PowerShell 5.1 for Windows) and dependency-free.
- **Field reports** — generated a course? Open an issue with the technology, the agent, and what was great or broken (a snippet of `.learn/course.json` helps).

## Development

```bash
npm test             # node:test, no dependencies
npm run validate     # SKILL.md against the Agent Skills spec
node bin/cli.js --dir /tmp/skills -y --dry-run
```

Rules of thumb:

- Keep `SKILL.md` under 500 lines; put detail in `references/` and link it from the table in SKILL.md.
- Skill instructions are in English; generated courses follow the learner's `lang`.
- No runtime dependencies in the installer.
- Bump `version` in **both** `package.json` and `skills/learn/SKILL.md` (`metadata.version`) — a test enforces it — and add a CHANGELOG entry.

## Commit style

Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

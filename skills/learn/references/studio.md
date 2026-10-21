# Browser Studio

The Studio is a small local web app shipped in `assets/studio/`. It puts the whole course on one page (`http://localhost:<port>`): dashboard with "Continue", lessons, exercises with a real terminal and a file editor, one-click *Set up / Check / Start over / Solution*, graduated hints, interactive quizzes, capstone milestones, a playground terminal, and progress. The learner never has to open an editor.

It reads the course exactly as the rest of this skill writes it. There is nothing course-specific in its code: if the course follows `course-structure.md`, `exercises.md`, `pedagogy.md` and `progress.md`, the Studio works. When it doesn't, fix the **course**, not the Studio.

## Requirements

- Node.js ≥ 20 and npm. Offer to install them (§4.5 of SKILL.md) if missing.
- `node-pty` (terminals): prebuilt on macOS and Windows; compiles on Linux and needs `python3`, `make`, `g++` (`sudo apt install -y python3 make g++` / `sudo dnf install -y python3 make gcc-c++`). Ask before installing.
- Windows: terminals run PowerShell; `.sh` scripts need Git Bash (`bash.exe` on `PATH`) unless the course also ships `.ps1` versions (`tools/check.ps1`, `setup.ps1`, `reset.ps1`), which the Studio prefers there.

## Install into a course (SKILL.md §4.4 step 6, or `/learn studio` on an existing course)

1. Copy `assets/studio/` to `<course>/studio/` (everything except `studio.sh` / `studio.ps1`), and those two launchers to the course root. `chmod +x studio.sh`.
2. Language: the UI follows `course.json` `params.lang`. `public/i18n.js` ships `en` and `fr`. For any other language, add a block with **every** key of `en` translated (regional tags like `pt-BR` fall back to `pt`, then `en`). Translate `studio/README.md` into `lang` too.
3. `course.json`:
   - `capstone.dir`: the folder where the learner builds the capstone, relative to the root (`capstone/starter`, or `capstone/app` if milestone 00 creates it). It may not exist yet; the terminal then opens in its parent.
   - `studio`: `{ "enabled": true, "port": 4242 }`. Pick a free port; if another course already uses 4242 (`curl -s localhost:4242/api/state`), use 4243, 4244…
   - Also write the port to `studio/studio.json` (`{ "port": 4242 }`), which is what the server and the launchers read.
4. `.gitignore`: add `studio/node_modules/`.
5. `cd studio && npm install --no-fund --no-audit`.
6. `node studio/server.js --check`: it loads the course, checks every lesson, exercise, solution, milestone and `tools/check`, parses every `quiz.md`, and lists errors (`✗`) and warnings (`!`). Fix the course until there is no error; fix warnings when they are real omissions (a missing solution, a question without an answer letter).
7. Start it (`./studio.sh`, or `.\studio.ps1` on Windows), then confirm `curl -fsS http://localhost:<port>/api/state` answers. Open the page in the learner's browser if you can.
8. Offer auto-start at login, only with the learner's approval: `./studio.sh --service` (systemd user unit `learn-studio-<slug>` on Linux, LaunchAgent on macOS) or `.\studio.ps1 -Service` (Startup-folder shortcut on Windows).
9. Mention the Studio in the course `README.md` (how to open it, the URL) and in the hand-off message.

## What the Studio reads (the course contract)

| Studio feature | Comes from |
|---|---|
| Navigation, titles, order | `.learn/course.json`: `modules[].{id, slug, title, lessons[].{id, file, title}, exercises[].{id, path, title, concepts, difficulty}, milestone}`, `capstone.{title, dir, milestones[].{id, file, title, module}}` |
| Module page | `<slug>/README.md` |
| Exercise statement and hints | `<exercise>/README.md`; hints are `<details><summary>Hint N</summary>…</details>` (N in the summary, any language), unfolded one by one and recorded as `hintsUsed` |
| *Set up* / *Start over* buttons | `<exercise>/setup.sh` / `reset.sh` (or `.ps1`), run in the exercise folder; buttons hidden if absent |
| *Check* | `tools/check.sh <exercise path>`; milestones: `tools/check.sh capstone <id>` — which append to `.learn/results.log` (`<ISO date>\t<target>\t<pass|fail>`) |
| *Solution* | `<module>/solutions/<exercise>/`, with `NOTES.md` (or `README.md`) shown as the explanation; opening it sets `solutionViewed` |
| Quiz | `<slug>/quiz.md` in the format of `pedagogy.md` › Quiz file format |
| Docs | `README.md`, `SETUP.md`, `capstone/README.md`, `studio/README.md` |
| Playground | `playground/` (terminal opened there; also the cwd of the global terminal drawer) |

It writes only `.learn/progress.json` (lessons read, quiz scores, hints, solutions viewed — exercise and milestone status are always recomputed from `results.log`) and `PROGRESS.md`, plus whatever the learner saves in the editor. The editor can't write into `.learn/` or `studio/`, nor outside the course.

## `/learn studio [start|stop|service|remove]`

- No argument or `start`: if the course has no `studio/`, install it (steps above, after asking). Otherwise start it if `/api/state` doesn't answer, and give the URL.
- `stop`: stop the server process you started, or `./studio.sh --stop-service` if auto-start is installed.
- `service`: `./studio.sh --service` / `.\studio.ps1 -Service`, after confirmation.
- `remove`: stop it, remove auto-start, delete `studio/`, `studio.sh`, `studio.ps1`, set `studio.enabled` to `false` — after confirmation.
- Updating the Studio of an existing course to a newer skill version: replace `studio/` except `node_modules/` and `studio.json`, keep any language you added to `i18n.js`, re-run `npm install` and `--check`.

## Troubleshooting

- `EADDRINUSE`: another Studio (often another course) uses the port; change `studio/studio.json` and restart.
- Blank terminal or "node-pty" error: `npm install` failed or ran with another Node major version; re-run `npm rebuild node-pty` in `studio/`.
- A quiz shows no questions or a question with no options: the file drifted from the format; `node studio/server.js --check` names the question.
- Security: the server listens on `127.0.0.1` only and rejects requests whose `Host`/`Origin` isn't `localhost:<port>`, so other web pages can't drive the terminals. Never change it to listen on `0.0.0.0`.

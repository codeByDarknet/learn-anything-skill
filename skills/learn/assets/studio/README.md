# Studio: the whole course in your browser

The Studio is a small local web app. It puts the whole course on one page: lessons, exercises, quizzes, capstone milestones and your progress. You don't need an editor or a separate terminal.

## Open it

**http://localhost:4242** (bookmark it; the port can differ, see below).

```bash
./studio.sh                 # macOS / Linux: start the Studio and open the browser
./studio.sh --service       # start it by itself at every login (systemd on Linux, launchd on macOS)
./studio.sh --stop-service  # remove that auto-start
./studio.sh --check         # validate the course for the Studio
```

```powershell
.\studio.ps1                # Windows: start the Studio and open the browser
.\studio.ps1 -Service       # start it by itself at every login
.\studio.ps1 -StopService   # remove that auto-start
```

The first launch installs the dependencies (`npm install` in `studio/`). Node.js 20 or newer is required. On Linux, `node-pty` compiles from source: install `python3`, `make` and `g++` first if `npm install` fails.

## What you can do

| Where | What |
|-------|------|
| **Dashboard** | "Continue" takes you to the next step. It also shows your stats, exercises to rework, weak concepts and progress per module. |
| **Lesson** | Read the lesson. Every command block has **Copy** and **→ Terminal** (pastes the command into the terminal drawer). "I've read this lesson" ticks it and moves on. |
| **Exercise** | Statement on the left, workspace on the right: a **Terminal** opened in the exercise folder, **Files** (editor with autosave, `Ctrl+S` to force) and **Output**. The *Set up*, *Check*, *Start over* and *Solution* buttons run the course scripts. |
| **Quiz** | Click an answer for multiple-choice questions. For open questions, write your answer, reveal the correction, then say honestly whether you had it. The score is saved. |
| **Milestones** | The same workspace as exercises, opened in the capstone folder. *Check* runs `tools/check capstone NN`. |
| **Playground** | A free terminal in `playground/` to experiment. The terminal drawer also opens anywhere with `Ctrl+`` ` (backtick). |

Hints unfold one at a time, and opening a solution is recorded, as the course asks. Progress comes from the real checks (`.learn/results.log`): `PROGRESS.md` and `.learn/progress.json` update by themselves.

## Security

- The server listens on `127.0.0.1` only: nobody else on the network can reach it.
- It checks the `Host` and `Origin` headers, so another web page can't drive your terminals.
- The editor can't write outside the course folder, nor into `.learn/` or `studio/`.

## Settings

- Port: `STUDIO_PORT=4343 ./studio.sh`, or `{"port": 4343}` in `studio/studio.json` (kept by the auto-start service).
- Shell used by the terminals: `STUDIO_SHELL=/bin/zsh` (default: your login shell; PowerShell on Windows).
- `node studio/server.js --check` lists anything in the course the Studio can't display (missing files, malformed quizzes).

## Under the hood

Node (`server.js`) with `node-pty` and WebSocket for terminals, `marked` and `highlight.js` to render the course. In the browser: xterm.js, CodeMirror 5 and plain JavaScript with no build step (`public/`). The interface language follows the course language (`public/i18n.js`).

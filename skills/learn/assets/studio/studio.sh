#!/usr/bin/env bash
# studio.sh — open the course in the browser (lessons, exercises, terminal, grading, progress).
# Lives at the course root, next to studio/.
#
#   ./studio.sh                 start the Studio and open http://localhost:<port>
#   ./studio.sh --service       install it as a user service (starts by itself at login; Linux systemd / macOS launchd)
#   ./studio.sh --stop-service  remove that service
#   ./studio.sh --check         validate the course for the Studio (manifest, files, quizzes) and exit
#
# Port: STUDIO_PORT, else studio/studio.json {"port": N}, else 4242.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUDIO="$ROOT/studio"

command -v node > /dev/null || { echo "Node.js 20+ is required: https://nodejs.org (or your package manager)." >&2; exit 1; }

json_get() { # json_get <file> <js expression on j>
  node -e "try { const j = require(process.argv[1]); const v = $2; if (v != null) process.stdout.write(String(v)); } catch {}" "$1"
}
PORT="${STUDIO_PORT:-$(json_get "$STUDIO/studio.json" 'j.port')}"
PORT="${PORT:-4242}"
SLUG="$(json_get "$ROOT/.learn/course.json" 'j.params && j.params.slug')"
SLUG="${SLUG:-course}"
TITLE="$(json_get "$ROOT/.learn/course.json" 'j.params && j.params.technology')"
URL="http://localhost:$PORT"
NAME="learn-studio-$SLUG"

need_deps() {
  if [[ ! -d "$STUDIO/node_modules/node-pty" ]]; then
    echo "Installing the Studio dependencies (once)…"
    (cd "$STUDIO" && npm install --no-fund --no-audit) || {
      echo "npm install failed. node-pty compiles from source on Linux: install python3, make and a C++ compiler" >&2
      echo "(Debian/Ubuntu: sudo apt install -y python3 make g++ · Fedora: sudo dnf install -y python3 make gcc-c++), then retry." >&2
      exit 1
    }
  fi
}

open_browser() {
  if command -v xdg-open > /dev/null; then xdg-open "$URL" > /dev/null 2>&1 &
  elif command -v open > /dev/null; then open "$URL"
  elif command -v wslview > /dev/null; then wslview "$URL"
  else echo "Open $URL in your browser."; fi
}

running() { curl -fsS "$URL/api/state" -o /dev/null 2> /dev/null; }

install_service() {
  local node; node="$(command -v node)"
  case "$(uname -s)" in
    Linux)
      local unit="$HOME/.config/systemd/user/$NAME.service"
      mkdir -p "$(dirname "$unit")"
      cat > "$unit" << UNITEOF
[Unit]
Description=Learn Studio — ${TITLE:-$SLUG} ($URL)

[Service]
WorkingDirectory=$STUDIO
Environment=STUDIO_PORT=$PORT
Environment=PATH=$(dirname "$node"):$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$node $STUDIO/server.js
Restart=on-failure

[Install]
WantedBy=default.target
UNITEOF
      systemctl --user daemon-reload
      systemctl --user enable --now "$NAME.service"
      echo "Logs: journalctl --user -u $NAME -f"
      ;;
    Darwin)
      local plist="$HOME/Library/LaunchAgents/dev.learn.$NAME.plist"
      mkdir -p "$(dirname "$plist")" "$HOME/Library/Logs"
      cat > "$plist" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.learn.$NAME</string>
  <key>ProgramArguments</key><array><string>$node</string><string>$STUDIO/server.js</string></array>
  <key>WorkingDirectory</key><string>$STUDIO</string>
  <key>EnvironmentVariables</key><dict>
    <key>STUDIO_PORT</key><string>$PORT</string>
    <key>PATH</key><string>$(dirname "$node"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/$NAME.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/$NAME.log</string>
</dict>
</plist>
PLISTEOF
      launchctl bootout "gui/$(id -u)" "$plist" 2> /dev/null || true
      launchctl bootstrap "gui/$(id -u)" "$plist"
      echo "Logs: tail -f ~/Library/Logs/$NAME.log"
      ;;
    *) echo "Auto-start is supported on Linux (systemd) and macOS (launchd). On Windows use .\\studio.ps1 -Service." >&2; exit 1 ;;
  esac
  echo "Studio installed: it runs now and will start again at every login → $URL"
}

remove_service() {
  case "$(uname -s)" in
    Linux)
      systemctl --user disable --now "$NAME.service" 2> /dev/null || true
      rm -f "$HOME/.config/systemd/user/$NAME.service"
      systemctl --user daemon-reload
      ;;
    Darwin)
      local plist="$HOME/Library/LaunchAgents/dev.learn.$NAME.plist"
      launchctl bootout "gui/$(id -u)" "$plist" 2> /dev/null || true
      rm -f "$plist"
      ;;
  esac
  echo "Service removed."
}

case "${1:-}" in
  --service) need_deps; install_service ;;
  --stop-service) remove_service ;;
  --check) need_deps; exec node "$STUDIO/server.js" --check ;;
  "")
    need_deps
    if running; then echo "The Studio is already running → $URL"; open_browser; exit 0; fi
    (sleep 1 && open_browser) &
    STUDIO_PORT="$PORT" exec node "$STUDIO/server.js"
    ;;
  *) sed -n '2,11p' "$0"; exit 2 ;;
esac

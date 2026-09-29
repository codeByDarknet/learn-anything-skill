#!/usr/bin/env bash
# tools/check.sh — grade exercises and capstone milestones.
#
# Template from the `learn` skill. Portable: bash 3.2+ (macOS), Linux, Git Bash/WSL.
# The agent adapts the CONFIG section and
# translates the MSG_* strings into the course language.
#
# Usage:
#   ./tools/check.sh                              # every exercise (solutions excluded)
#   ./tools/check.sh 03-deployments               # one module
#   ./tools/check.sh 03-deployments/exercises/02-rolling-update
#   ./tools/check.sh capstone [NN]                # capstone milestone NN (cumulative) or all
#   ./tools/check.sh --authoring [target]         # course authors: stubs must fail, solutions must pass

set -uo pipefail

# ─── CONFIG (adapted per technology) ─────────────────────────────────────────
# A directory is an exercise if it contains a check.sh, or a file matching NATIVE_TEST_GLOB.
NATIVE_TEST_GLOB='*_test.go'
# Command run inside the exercise directory for native tests.
run_native() { go test ./... 2>&1; }
# Capstone milestone runner: receives the milestone number (e.g. 03).
run_milestone() { bash "capstone/tests/validate-$1.sh" 2>&1; }
# ─── MESSAGES (translated) ───────────────────────────────────────────────────
MSG_CHECKING="Checking"
MSG_PASS="PASS"
MSG_FAIL="FAIL"
MSG_SUMMARY="Summary"
MSG_TOTAL="Total"
MSG_PASSED="Passed"
MSG_FAILED="Failed"
MSG_TODO="To work on"
MSG_NONE="No exercise found in"
MSG_NOT_FOUND="Not found:"
MSG_ALL_GREEN="All checks pass!"
MSG_STUB_SHOULD_FAIL="stub passes but should fail"
MSG_SOLUTION_SHOULD_PASS="solution fails but should pass"
MSG_NO_SOLUTION="no matching solution"
# ─────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2
LOG="$ROOT/.learn/results.log"
mkdir -p "$ROOT/.learn"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; B=$'\033[34m'; BOLD=$'\033[1m'; N=$'\033[0m'
else
  R=''; G=''; Y=''; B=''; BOLD=''; N=''
fi
line() { printf '%s\n' "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"; }
now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
record() { printf '%s\t%s\t%s\n' "$(now)" "$1" "$2" >> "$LOG"; }

AUTHORING=0
if [[ "${1:-}" == "--authoring" ]]; then AUTHORING=1; shift; fi
TARGET="${1:-}"

is_exercise() {
  local d="$1"
  [[ -f "$d/check.sh" ]] && return 0
  compgen -G "$d/$NATIVE_TEST_GLOB" > /dev/null
}

# Run the check of one exercise directory; prints output, returns its status.
run_exercise() {
  local d="$1"
  if [[ -f "$d/check.sh" ]]; then
    (cd "$d" && bash ./check.sh 2>&1)
  else
    (cd "$d" && run_native)
  fi
}

list_exercises() {
  local base="$1" include_solutions="$2"
  find "$base" -type d \( -name node_modules -o -name .git -o -name target -o -name build -o -name .venv -o -name .dart_tool \) -prune -o -type d -print 2>/dev/null \
    | sort | while IFS= read -r d; do
        [[ "$d" == ./capstone* || "$d" == capstone* || "$d" == ./playground* || "$d" == playground* ]] && continue
        if [[ "$include_solutions" == 0 && "$d" == */solutions/* ]]; then continue; fi
        [[ "$d" == */exercises/* || "$d" == */solutions/* ]] || continue
        # Only the exercise root: parent dir must be exercises/ or solutions/
        local parent; parent="$(basename "$(dirname "$d")")"
        [[ "$parent" == exercises || "$parent" == solutions ]] || continue
        is_exercise "$d" && printf '%s\n' "${d#./}"
      done
}

TOTAL=0; PASSED=0; FAILED=0; FAILED_LIST=()

grade() { # grade <label> <status 0|1> <output>
  TOTAL=$((TOTAL + 1))
  if [[ "$2" == 0 ]]; then
    printf '  %-60s %s\n' "$1" "${G}✓ ${MSG_PASS}${N}"; PASSED=$((PASSED + 1))
  else
    printf '  %-60s %s\n' "$1" "${R}✗ ${MSG_FAIL}${N}"; FAILED=$((FAILED + 1)); FAILED_LIST+=("$1")
    [[ -n "$3" ]] && printf '%s\n' "$3" | head -25 | sed 's/^/      /'
  fi
}

summary() {
  echo; line; echo "${BOLD}  ${MSG_SUMMARY}${N}"; line
  echo "  ${MSG_TOTAL}: ${BOLD}${TOTAL}${N}   ${MSG_PASSED}: ${G}${PASSED}${N}   ${MSG_FAILED}: ${R}${FAILED}${N}"
  if (( FAILED > 0 )); then
    echo; echo "${Y}${MSG_TODO}:${N}"; printf '  - %s\n' "${FAILED_LIST[@]}"; exit 1
  fi
  (( TOTAL > 0 )) && echo "${G}${BOLD}  🎉 ${MSG_ALL_GREEN}${N}"
  exit 0
}

# ─── capstone ────────────────────────────────────────────────────────────────
if [[ "$TARGET" == capstone* ]]; then
  N_ARG="${2:-}"
  [[ "$TARGET" == capstone/* ]] && N_ARG="${TARGET#capstone/}"
  MS=(); while IFS= read -r l; do MS+=("$l"); done < <(find capstone/tests -maxdepth 1 -name 'validate-*.sh' 2>/dev/null | sed -E 's/.*validate-([0-9]+)\.sh/\1/' | sort)
  line; echo "${BOLD}  ${MSG_CHECKING}: capstone ${N_ARG}${N}"; line
  for m in ${MS[@]+"${MS[@]}"}; do
    [[ -n "$N_ARG" && "10#$m" -gt "10#$N_ARG" ]] && continue   # cumulative: 01..N
    out="$(run_milestone "$m")"; st=$?
    grade "capstone/$m" "$st" "$out"
    record "capstone/$m" "$([[ $st == 0 ]] && echo pass || echo fail)"
  done
  summary
fi

# ─── exercises ───────────────────────────────────────────────────────────────
SEARCH="${TARGET:-.}"
[[ -e "$SEARCH" ]] || { echo "${R}✗ ${MSG_NOT_FOUND} ${SEARCH}${N}"; exit 2; }

line; echo "${BOLD}  ${MSG_CHECKING}: ${TARGET:-*}${N}"; line

if (( AUTHORING )); then
  EXS=(); while IFS= read -r l; do EXS+=("$l"); done < <(list_exercises "$SEARCH" 0)
  for ex in ${EXS[@]+"${EXS[@]}"}; do
    sol="${ex/\/exercises\//\/solutions\/}"
    [[ -f "$ex/setup.sh" ]] && (cd "$ex" && bash ./setup.sh > /dev/null 2>&1)
    out="$(run_exercise "$ex")"; st=$?
    if [[ $st == 0 ]]; then grade "$ex  (${MSG_STUB_SHOULD_FAIL})" 1 "$out"; else grade "$ex  [stub fails]" 0 ""; fi
    if [[ ! -d "$sol" ]]; then grade "$sol  (${MSG_NO_SOLUTION})" 1 ""; continue; fi
    if [[ -f "$sol/apply.sh" ]]; then            # infra: apply the solution, then run the exercise check
      (cd "$sol" && bash ./apply.sh > /dev/null 2>&1)
      out="$(run_exercise "$ex")"; st=$?
      [[ -f "$ex/reset.sh" ]] && (cd "$ex" && bash ./reset.sh > /dev/null 2>&1)
    else
      out="$(run_exercise "$sol")"; st=$?
    fi
    if [[ $st == 0 ]]; then grade "$sol  [solution passes]" 0 ""; else grade "$sol  (${MSG_SOLUTION_SHOULD_PASS})" 1 "$out"; fi
  done
  (( TOTAL == 0 )) && echo "${Y}  ${MSG_NONE} ${SEARCH}${N}"
  summary
fi

INCLUDE_SOL=0; [[ "$SEARCH" == *solutions* ]] && INCLUDE_SOL=1
if is_exercise "$SEARCH" && [[ "$SEARCH" == */exercises/* || "$SEARCH" == */solutions/* ]]; then
  EXS=("${SEARCH%/}")
else
  EXS=(); while IFS= read -r l; do EXS+=("$l"); done < <(list_exercises "$SEARCH" "$INCLUDE_SOL")
fi

for ex in ${EXS[@]+"${EXS[@]}"}; do
  out="$(run_exercise "$ex")"; st=$?
  grade "$ex" "$st" "$out"
  [[ "$ex" == */solutions/* ]] || record "$ex" "$([[ $st == 0 ]] && echo pass || echo fail)"
done
(( TOTAL == 0 )) && echo "${Y}  ${MSG_NONE} ${SEARCH}${N}"
summary

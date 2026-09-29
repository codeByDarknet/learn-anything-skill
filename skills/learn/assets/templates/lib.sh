#!/usr/bin/env bash
# tools/lib.sh — assertion helpers for exercise check.sh scripts (infra, tools, data stores).
# Template from the `learn` skill. Messages passed to assert* should be written in the course language.
#
#   source "$(cd "$(dirname "$0")/../../.." && pwd)/tools/lib.sh"
#   assert          "<what must be true>" <command...>          # passes if the command exits 0
#   assert_eq       "<what must be true>" "<expected>" "<actual>"
#   assert_contains "<what must be true>" "<needle>" "<haystack>"
#   assert_fails    "<what must be refused>" <command...>       # passes if the command exits non-zero
#   summary                                                      # prints the result, exits 1 on any failure

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  _R=$'\033[31m'; _G=$'\033[32m'; _D=$'\033[2m'; _N=$'\033[0m'
else
  _R=''; _G=''; _D=''; _N=''
fi
_OK=0; _KO=0

_pass() { printf '  %s✓%s %s\n' "$_G" "$_N" "$1"; _OK=$((_OK + 1)); }
_fail() { printf '  %s✗%s %s\n' "$_R" "$_N" "$1"; [[ -n "${2:-}" ]] && printf '%s\n' "$2" | head -10 | sed "s/^/      ${_D}/;s/\$/${_N}/"; _KO=$((_KO + 1)); }

assert() {
  local msg="$1"; shift
  local out
  if out="$("$@" 2>&1)"; then _pass "$msg"; else _fail "$msg" "$out"; fi
}

assert_fails() {
  local msg="$1"; shift
  if "$@" > /dev/null 2>&1; then _fail "$msg" "(the command succeeded but should have failed: $*)"; else _pass "$msg"; fi
}

assert_eq() {
  if [[ "$2" == "$3" ]]; then _pass "$1"; else _fail "$1" "expected: $2"$'\n'"actual:   $3"; fi
}

assert_contains() {
  if [[ "$3" == *"$2"* ]]; then _pass "$1"; else _fail "$1" "expected to contain: $2"$'\n'"actual: $(printf '%s' "$3" | head -5)"; fi
}

summary() {
  echo "  ── ${_OK} ✓ / ${_KO} ✗"
  (( _KO == 0 ))
  exit $?
}

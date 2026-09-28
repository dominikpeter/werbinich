#!/usr/bin/env bash
# PostToolUse(Edit|Write): the pre-commit checks, on just this file, right after the edit (a failed commit later costs more).
# eslint --fix first (it tidies what it can), then whatever is left goes back to Claude (exit 2 = stderr is shown to it).
f=$(jq -r '.tool_input.file_path // ""')
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
rel=${f#"$PWD/"}
[ -f "$rel" ] || exit 0
out=""
case "$rel" in
  src/*|e2e/*|scripts/*.mts|*.config.ts|*.config.mjs)
    case "$rel" in *.ts|*.tsx|*.mts|*.mjs) out=$(npx eslint --fix --max-warnings=0 "$rel" 2>&1) || true ;; esac ;;
  .github/workflows/*) out=$(actionlint "$rel" 2>&1) || true ;;
esac
case "$rel" in
  src/lib/ai.ts) ;;
  src/*|docs/*) grep -n "ß" "$rel" >/dev/null && out="$out
$rel: Swiss spelling, write \"ss\" instead of \"ß\": $(grep -n "ß" "$rel" | head -3)" ;;
esac
out=$(printf '%s' "$out" | grep -vE "^\s*$")
[ -z "$out" ] && exit 0
printf 'Checks on %s found problems, fix them:\n%s\n' "$rel" "$out" >&2
exit 2

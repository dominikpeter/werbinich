#!/usr/bin/env bash
# Stop: don't end a turn with TypeScript broken. Only when .ts/.tsx files have uncommitted changes; once per stop
# (stop_hook_active: Claude is already fixing it, let it stop the next time rather than loop).
input=$(cat)
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = true ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git status --porcelain -- '*.ts' '*.tsx' '*.mts' | grep -q . || exit 0
out=$(npx tsc --noEmit 2>&1) && exit 0
jq -n --arg r "TypeScript fails on the uncommitted changes, fix it before stopping:
$(printf '%s' "$out" | head -20)" '{decision: "block", reason: $r}'

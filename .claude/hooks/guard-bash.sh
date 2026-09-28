#!/usr/bin/env bash
# PreToolUse(Bash): stop the shortcuts that break the workflow or leak a key, before they run.
# deny = blocked with the reason shown to Claude; ask = the user confirms.
cmd=$(jq -r '.tool_input.command // ""')
decide() { jq -n --arg d "$1" --arg r "$2" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'; exit 0; }
git_cmd() { printf '%s' "$cmd" | grep -qE "(^|[;&|(\`[:space:]])git( -C [^ ]+)? $1"; }

if printf '%s' "$cmd" | grep -qE -- "git( -C [^ ]+)? (commit|push)[^;&|]*--no-verify|(^|[;&|[:space:]])SKIP=[^ ]+( [A-Z_]+=[^ ]+)* git "; then
  decide deny "Hooks are the quality gate (lint, types, tests, secret scan). Fix what they report instead of skipping them."
fi
if git_cmd push && printf '%s' "$cmd" | grep -qE -- "(--force([^-]|$)|[[:space:]]-f([[:space:]]|$))"; then
  decide deny "No force-push. If history must change, use --force-with-lease on dev, never on main."
fi
if git_cmd "(commit|push|merge)" && [ "$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)" = main ]; then
  decide deny "You're on main. Work on dev (git switch dev) and ship through a pull request (just pr)."
fi
# keys: never print an env file or a key variable (piping one into a tool that stores it is fine)
if printf '%s' "$cmd" | grep -qE "(cat|less|more|head|tail|bat|nl|xxd|strings|open)[[:space:]]+[^|;&]*\.env" ||
   printf '%s' "$cmd" | grep -qE "(echo|printf)[^|;&]*\\\$\{?[A-Z_]*(KEY|TOKEN|SECRET)"; then
  decide deny "That would print a secret. Read names only (sed 's/=.*//' .env.local) or pipe the value straight into the tool that stores it."
fi
if printf '%s' "$cmd" | grep -qE "vercel( [a-z-]+)* deploy[^|;&]*--prod"; then
  decide ask "Production deploys normally go through CI (just release → merge). Deploy by hand anyway?"
fi
exit 0

#!/usr/bin/env bash
# PreToolUse(Edit|Write): files that must not be hand-edited.
f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
rel=${f#"${CLAUDE_PROJECT_DIR:-$PWD}/"}
reason=""
case "$rel" in
  .env*|*/.env*) reason="Env files hold keys: the user sets them with just secret NAME." ;;
  package-lock.json) reason="Generated: change package.json and run npm install." ;;
  next-env.d.ts|.next/*|ios/App/App/public/*|test-results/*|playwright-report/*) reason="Generated file: change its source instead." ;;
  skills-lock.json|.agents/skills/*|.claude/skills/*) reason="Installed skills: update them with npx skills add/update, not by hand." ;;
esac
[ -z "$reason" ] && exit 0
jq -n --arg r "$reason" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'

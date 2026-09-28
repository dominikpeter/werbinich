#!/usr/bin/env bash
# commit-msg hook: Conventional Commits, so GitHub's release notes and `git log` read as a changelog.
# "feat: …", "fix(ai): …", "perf!: …"; merges, reverts and fixups pass as git writes them.
set -euo pipefail
subject=$(head -1 "$1")
if printf '%s' "$subject" | grep -qE '^(Merge|Revert|fixup!|squash!) '; then exit 0; fi
if printf '%s' "$subject" | grep -qE '^(feat|fix|perf|refactor|style|test|docs|chore|ci|build|release|revert)(\([a-z0-9-]+\))?!?: .{3,}'; then exit 0; fi
echo "commit message must look like 'feat: …' or 'fix(ai): …' (feat fix perf refactor style test docs chore ci build release revert), got:" >&2
echo "  $subject" >&2
exit 1

# werbinich.ai tasks. `just` lists them. Every recipe is a thin wrapper around package.json / CLI tools.

default:
    @just --list

# install dependencies and git hooks
setup:
    npm install
    prek install

# dev server on :3048 with in-memory rooms and real AI (OPENROUTER_API_KEY in .env.local)
dev:
    npm run dev

# production build
build:
    npm run build

lint:
    npm run lint

typecheck:
    npx tsc --noEmit

# unit tests (game rules)
test:
    npm test

# everything a commit must pass
check: lint typecheck test

# e2e on Android Chrome + iPhone WebKit against a local production build with canned AI (:3049). Args go to playwright
e2e *args:
    npx playwright test --workers=2 {{args}}

# e2e against the live site with real AI (the specs that need no canned answers)
e2e-prod *args:
    BASE_URL=https://werbinich-psi.vercel.app npx playwright test --workers=2 -g "tokens|one phone" {{args}}

# live check of every AI call (Jev, Luna, Swiss German routing) against OpenRouter; well under a cent
ai-smoke:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env.local; set +a
    npx tsx scripts/ai-smoke.mts

# benchmark speech-to-text models on OpenRouter (accuracy, latency, cost); MODELS=a,b to pick. Needs ffmpeg + macOS say
bench-stt:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env.local; set +a
    npx tsx scripts/bench-stt.mts

# benchmark chat models for the joker and give-up (quality, latency, cost); MODELS=a,b to pick
bench-llm:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env.local; set +a
    npx tsx scripts/bench-llm.mts

# fail if a secret-looking string is in the last commit
secrets:
    ! git log -p -1 | grep -qE "sk-(or-v1-|proj-)?[A-Za-z0-9_-]{20,}"

# push the current branch (dev) and open its pull request into main, or show the one that's open
pr:
    #!/usr/bin/env bash
    set -euo pipefail
    git push -u origin HEAD
    open=$(gh pr list --head "$(git branch --show-current)" --state open --json url -q '.[0].url // ""')
    if [ -n "$open" ]; then echo "$open"; else gh pr create --base main --fill; fi

# on dev: bump the version onto the PR into main; merging it ships (CI: Vercel deploy, tag, GitHub release, iOS). `just release 0.2.0 "notes"`
release version notes: check secrets
    #!/usr/bin/env bash
    set -euo pipefail
    [ "$(git branch --show-current)" != main ] || { echo "release from dev: main only changes through a pull request"; exit 1; }
    npm version {{version}} --no-git-tag-version --allow-same-version
    git add package.json package-lock.json && git commit -m "release: v{{version}}" || true
    just version-check
    git push -u origin HEAD
    open=$(gh pr list --head "$(git branch --show-current)" --state open --json number -q '.[0].number // ""')
    if [ -n "$open" ]; then gh pr edit "$open" --title "Release v{{version}}" --body {{quote(notes)}} && gh pr view "$open" --json url -q .url; else gh pr create --base main --title "Release v{{version}}" --body {{quote(notes)}}; fi

# the version the settings sheet shows (package.json) matches the release tag and GitHub's latest release
version-check:
    bash scripts/check-version.sh

# one-time: give ci.yml's deploy job a Vercel token (asks for it hidden, never echoed) so CI can deploy on its own
vercel-ci-setup:
    bash scripts/setup-vercel-ci.sh

# deploy the current tree to production by hand (normally a release merge into main does it)
deploy:
    vercel deploy --prod

# store any secret without it ever showing: `just secret NAME` (.env.local + Vercel), `just secret NAME local`
secret name where="":
    bash scripts/secret.sh {{name}} {{where}}

# iOS: sync the native shell and open it in Xcode (build, sign and run from there)
ios:
    npx cap sync ios
    npx cap open ios

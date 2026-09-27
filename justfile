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

# e2e against the live site
e2e-prod *args:
    BASE_URL=https://werbinich.vercel.app npx playwright test --workers=2 {{args}}

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

# deploy the current tree to production by hand (normally a merge into main does it)
deploy:
    vercel deploy --prod

# store any secret without it ever showing: `just secret NAME` (.env.local + Vercel), `just secret NAME local`
secret name where="":
    bash scripts/secret.sh {{name}} {{where}}

# iOS: sync the native shell and open it in Xcode (build, sign and run from there)
ios:
    npx cap sync ios
    npx cap open ios

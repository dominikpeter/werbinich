# werbinich.ai: instructions for GitHub Copilot (code review and coding agent)

werbinich.ai is a Next.js 16 / React 19 "Who am I?" party game with AI at the table. `AGENTS.md` is the source
of truth for how to work in this repo; read it first. The essentials:

## Reviewing a pull request

Report only real problems, each with a concrete failure scenario; no style nits, no praise. In this order:

1. **Correctness:** logic errors, wrong conditions, missing `await`, broken edge cases, race conditions.
2. **Security:** room access (`src/lib/room.ts`: every action checks the player's id and token; a phone never gets its
   own secret person), the per-room AI budget, body size limits (`src/app/api/rooms/handle.ts`), secrets, AI output and
   transcripts treated as untrusted data (`src/lib/ai.ts`).
3. **This repo's rules:**
   - Every UI string lives in `src/lib/i18n.ts`, in German (default), English and French.
   - German text uses Swiss spelling: "ss", never "ß".
   - No raw colors and no arbitrary Tailwind values where a token exists: use the tokens in `src/app/globals.css`.
     No emojis: lucide icons.
   - Mobile first: the e2e suite runs on Android Chrome and iPhone WebKit.
   - Any change players can see updates `docs/MANUAL.md`.
4. **Tests:** new behavior has a test (unit: `src/lib/*.test.ts`, e2e: `e2e/*.spec.ts`).

## Writing code (coding agent)

- Use the `justfile` for everything: `just check` (lint, typecheck, unit tests), `just e2e <spec>`.
- Branch from and open pull requests against `dev`, never `main`.
- Keep changes small and match the surrounding code: comment density, naming, idiom.

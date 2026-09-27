<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Working on werbinich.ai

"Wer bin ich?" with AI at the table: Next.js 16 / React 19, rooms in Upstash Redis (memory in dev), every AI call through
OpenRouter (`src/lib/ai.ts`). Same stack and habits as Zettelispiil.

## Commands: use `just`

| Recipe | Does |
| --- | --- |
| `just setup` | `npm install` + `prek install` (git hooks) |
| `just dev` | dev server on :3048, in-memory rooms, real AI from `.env.local` |
| `just check` | lint + typecheck + unit tests (what the pre-commit hook runs) |
| `just e2e [args]` | Playwright on Android Chrome + iPhone WebKit, production build with canned AI on :3049 |
| `just ai-smoke` | every AI call live against OpenRouter, Swiss German lines included |
| `just bench-stt` / `just bench-llm` | pick models: accuracy, latency, cost per model |
| `just pr` | push the branch and open its pull request into `main` |
| `just release X.Y.Z "notes"` | on `dev`: check, secret scan, bump the version onto the PR; merging it ships (CI deploys to Vercel, tags, writes the GitHub release, builds iOS) |
| `just vercel-ci-setup` | one-time: the Vercel token for CI's deploy job; the user runs it, it prompts hidden |
| `just secret NAME` | store a key hidden in `.env.local` and Vercel; the user runs it |
| `just ios` | sync the iOS shell and open Xcode |

## How the AI fits together

- **STT** (`gpt-4o-mini-transcribe`, fallback `whisper-large-v3-turbo`): only speech leaves the phone. `src/lib/listen.ts`
  detects voice, cuts each utterance (with 300 ms before it), sends 16 kHz WAV to `/api/rooms/[code]/hear`.
- **Luna** (`gpt-6-luna`, fallback `deepseek-v4.1-flash`) writes text: tidies a raw (often Swiss German) transcript into
  a clean question, the joker's 5 questions, the give-up candidates, person suggestions. Luna never sees the secret.
- **Jev** (`~typesafe/jev-latest`, `POST /api/alpha/decisions`) decides, with probabilities: is the line a question,
  did the table say yes/no, is a question a guess of this person, the truthful answer, the warmth meter, which joker
  question helps most, which candidate fits. Jev sees the secret only server side; phones never get it for their own card.
- `E2E_FAKE_AI=1` swaps every call for canned answers (tests). No key: the game still runs with typing and buttons.

## Conventions

- Game rules are pure (`src/lib/game.ts`, unit tested); `src/lib/room.ts` does locks, auth and AI around them. AI calls
  run outside the room lock.
- UI strings live in `src/lib/i18n.ts` in DE (default, Swiss spelling: "ss", never "ß"), EN and FR. Add all three.
- Icons from lucide-react, no emojis. Colours only through theme tokens in `globals.css` (`@shadcn/lint` rejects raw ones).
- Work on `dev`; `main` changes only through pull requests (ruleset: green `check` + `e2e`, Copilot reviews every push,
  `.github/copilot-instructions.md`). Vercel posts a preview per PR. A merge carrying a new `package.json` version
  (`just release`) is the release: CI deploys to Vercel, tags, writes the GitHub release, starts the iOS build.
- Agents never type, paste, or commit secrets. Don't bypass hooks with `--no-verify`.
- Player-facing changes: update `docs/MANUAL.md` in the same commit.

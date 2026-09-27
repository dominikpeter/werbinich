# werbinich.ai

**Wer bin ich?** — the party game where the AI is listening. Everyone gets a famous person they can't see; ask yes/no
questions out loud until you know who you are.

- **Speak, don't type.** One phone listens (hands-free or hold-to-talk). Only speech is sent, silence costs nothing.
  Swiss German works: Luna cleans up what was heard, Jev decides whether it was a question, a yes, a no or chatter.
- **Jev referees.** It knows the secret, so the table sees "Jev thinks: yes · 92%" and a yes to a correct guess solves it.
- **Jev warmth.** After every answer: how close the facts bring you to your person.
- **Joker.** Luna suggests 5 questions without knowing you; Jev, who does, picks the one that helps most.
- **Give up.** Luna names who fits your answers, your person is mixed in, and Jev bets: would the AI have known?
- **Your path.** Every question as a decision tree, taken branch lit, warmth on each node, gold star at the end.
- **The reveal.** Solved cards flip up; the one who wrote a card can reveal it for the rest.

Play in a room (every phone joins by QR/code) or on one phone passed around the table. DE / EN / FR.

```sh
just setup   # once
just dev     # http://localhost:3048
just check && just e2e
```

Stack: Next.js 16, React 19, Tailwind 4, Upstash Redis, OpenRouter (STT, Luna, Jev), Capacitor iOS shell, Vercel.
See `AGENTS.md` for how the AI fits together and `docs/MANUAL.md` for the rules.

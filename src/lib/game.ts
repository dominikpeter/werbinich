// Pure game rules of "Wer bin ich?": no I/O, no AI. room.ts loads/saves and feeds in what the AI said.
export type Answer = "yes" | "no";
export type Lang = "de" | "en" | "fr";

export type Question = {
  id: string;
  text: string;
  voice: boolean; // spoken (and transcribed) rather than typed
  joker: boolean; // taken from a joker's suggestion
  answer?: Answer;
  /** Jev, knowing the secret: probability the truthful answer is yes, and that the question names a person */
  truth?: number;
  guess?: number;
  /** Jev after the answer: how strongly all facts so far point to the secret person (0..1) */
  warmth?: number;
};

export type Joker = { questions: { text: string; p: number }[]; best: number };
export type GiveUp = { candidates: { name: string; p: number }[]; pick: number };

export type Player = {
  id: string;
  name: string;
  token: string;
  /** who this player writes a person for (never themselves) */
  writesFor: string;
  /** the secret person this player has to find out, written by `writtenBy` */
  person: string;
  writtenBy: string;
  status: "playing" | "solved" | "gaveup";
  place: number; // 1 = solved first; 0 = not solved
  questions: Question[];
  jokers: number;
  hints: Joker[];
  giveUp: GiveUp | null;
  unlocked: boolean; // the writer showed the card to everyone
};

export type Room = {
  code: string;
  lang: Lang;
  local: boolean; // one phone passed around: the host's phone acts for every player
  host: string;
  phase: "lobby" | "write" | "play" | "end";
  players: Player[];
  turn: string; // id of the player asking
  game: number; // counts rounds of "play again"
  aiCalls: number;
  updated: number;
};

export const JOKERS = 2;
export const MAX_PLAYERS = 12;
export const MAX_QUESTIONS = 60;

export class GameError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
export const byId = (r: Room, id: string) => r.players.find((p) => p.id === id);
export const pending = (p: Player) => p.questions.find((q) => !q.answer);

/** a random permutation with no fixed point: everyone writes for someone else (rejection sampling, fine for ≤12) */
export function derange<T>(xs: T[], rnd = Math.random): T[] {
  if (xs.length < 2) throw new GameError("too_few");
  for (;;) {
    const ys = [...xs];
    for (let i = ys.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [ys[i], ys[j]] = [ys[j], ys[i]];
    }
    if (ys.every((y, i) => y !== xs[i])) return ys;
  }
}

export function start(r: Room, rnd = Math.random) {
  if (r.players.length < 2) throw new GameError("too_few");
  const targets = derange(r.players.map((p) => p.id), rnd);
  r.players.forEach((p, i) => Object.assign(p, fresh(), { writesFor: targets[i] }));
  r.phase = "write";
  r.turn = "";
  r.game++;
}

const fresh = (): Omit<Player, "id" | "name" | "token" | "writesFor"> => ({
  person: "", writtenBy: "", status: "playing", place: 0, questions: [], jokers: JOKERS, hints: [], giveUp: null, unlocked: false,
});

export function write(r: Room, writer: string, person: string) {
  if (r.phase !== "write") throw new GameError("not_now");
  const w = byId(r, writer);
  const target = w && byId(r, w.writesFor);
  const name = clean(person, 60);
  if (!target || !name) throw new GameError("bad_request");
  target.person = name;
  target.writtenBy = writer;
  if (r.players.every((p) => p.person)) {
    r.phase = "play";
    r.turn = r.players[0].id;
  }
}

export function ask(r: Room, asker: string, text: string, opts: { voice?: boolean; joker?: boolean; id: string }) {
  const p = byId(r, asker);
  if (r.phase !== "play" || !p || r.turn !== asker || p.status !== "playing") throw new GameError("not_your_turn");
  if (pending(p)) throw new GameError("pending");
  if (p.questions.length >= MAX_QUESTIONS) throw new GameError("too_many");
  const q = clean(text, 200);
  if (!q) throw new GameError("bad_request");
  p.questions.push({ id: opts.id, text: q, voice: !!opts.voice, joker: !!opts.joker });
  return p.questions.at(-1)!;
}

/**
 * The table answers the open question. "yes" keeps the turn, "no" passes it on. A yes to a question Jev reads as a guess
 * of this very person solves it; `solved` (the "Erraten!" button) does so regardless of Jev.
 */
export function answer(r: Room, by: string, qid: string, a: Answer, solved = false) {
  const p = byId(r, r.turn);
  const q = p && pending(p);
  if (r.phase !== "play" || !p || !q || q.id !== qid) throw new GameError("stale");
  if (by === p.id && !r.local) throw new GameError("not_you");
  q.answer = solved ? "yes" : a;
  if (solved || (a === "yes" && (q.guess ?? 0) > 0.5)) return solve(r, p);
  if (a === "no") next(r);
}

function solve(r: Room, p: Player) {
  p.status = "solved";
  p.place = Math.max(0, ...r.players.map((x) => x.place)) + 1;
  next(r);
}

export function giveUp(r: Room, who: string, g: GiveUp) {
  const p = byId(r, who);
  if (r.phase !== "play" || !p || r.turn !== who || p.status !== "playing") throw new GameError("not_your_turn");
  p.giveUp = g;
  p.status = "gaveup";
  p.questions = p.questions.filter((q) => q.answer); // an open question dies with the give-up
  next(r);
}

/** next player still playing after the current one; nobody left → the game ends */
export function next(r: Room) {
  const i = r.players.findIndex((p) => p.id === r.turn);
  for (let k = 1; k <= r.players.length; k++) {
    const p = r.players[(i + k) % r.players.length];
    if (p.status === "playing") {
      r.turn = p.id;
      const open = pending(p);
      if (open) p.questions = p.questions.filter((q) => q !== open); // an unanswered question from a skipped turn is dropped
      return;
    }
  }
  r.phase = "end";
  r.turn = "";
}

/** the host calls the game off: everyone back to the lobby, persons and questions gone */
export function cancel(r: Room) {
  r.players.forEach((p) => Object.assign(p, fresh(), { writesFor: "" }));
  r.phase = "lobby";
  r.turn = "";
}

/** the writer (or, in a one-phone game, the host) turns the card face up for everyone */
export function unlock(r: Room, by: string, target: string) {
  const t = byId(r, target);
  if (!t || (t.writtenBy !== by && !(r.local && by === r.host))) throw new GameError("not_you");
  if (t.status === "playing" && r.phase !== "end") throw new GameError("not_now");
  t.unlocked = true;
}

/** facts for the AI, oldest first: the answered questions only */
export const facts = (p: Player) => p.questions.filter((q) => q.answer).map((q) => ({ q: q.text, a: q.answer! }));
export const factText = (p: Player) => facts(p).map((f, i) => `${i + 1}. ${f.q} → ${f.a}`).join("\n") || "(no questions yet)";

/** a player's view hides their own person until they solved it, gave up, or the writer unlocked it; tokens never leave */
export function viewFor(r: Room, me: string) {
  const self = byId(r, me);
  const seesAll = r.local; // one shared phone: the table hides the screen from the guesser
  return {
    ...r,
    aiCalls: undefined,
    me,
    players: r.players.map(({ token, ...p }) => {
      void token; // tokens never leave the server
      const hidden = !seesAll && p.id === me && p.status === "playing" && !p.unlocked && r.phase !== "end";
      const hideGiveUp = hidden || (!seesAll && p.id === me && !p.unlocked && p.status !== "solved" && r.phase !== "end" && p.status === "playing");
      return { ...p, person: hidden ? "" : p.person, giveUp: hideGiveUp ? null : p.giveUp, writesForName: byId(r, p.writesFor)?.name ?? "", writing: self?.writesFor === p.id };
    }),
  };
}
export type View = ReturnType<typeof viewFor>;
export type ViewPlayer = View["players"][number];

// server side of rooms: load/save with a short lock, who may do what, and where the AI comes in.
// AI calls run outside the lock (they take ~1 s): check the move on a copy, ask the AI, then apply it for real.
import * as ai from "./ai";
import { answer, ask, byId, clean, GameError, giveUp, MAX_PLAYERS, next, pending, start, unlock, viewFor, write, type Answer, type Lang, type Player, type Room } from "./game";
import type { Store } from "./store";

const TTL = 60 * 60 * 24; // rooms vanish a day after the last move
const AI_CAP = 800; // AI calls per room: a runaway loop or a script can't spend more than a few cents
const k = (code: string) => `wbi:room:${code}`;
const id = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O: read aloud across a table

async function load(db: Store, code: string) {
  const r = await db.get<Room>(k(code));
  if (!r) throw new GameError("not_found", 404);
  return r;
}
const save = (db: Store, r: Room) => db.set(k(r.code), { ...r, updated: Date.now() }, { ex: TTL });

/** one writer at a time per room; ponytail: spin lock with a 5 s lease, fine for a table of phones */
async function mutate<T>(db: Store, code: string, fn: (r: Room) => T | Promise<T>): Promise<T> {
  const lock = `${k(code)}:lock`;
  for (let i = 0; !(await db.set(lock, 1, { ex: 5, nx: true })); i++) {
    if (i > 60) throw new GameError("busy", 503);
    await new Promise((res) => setTimeout(res, 50));
  }
  try {
    const r = await load(db, code);
    const out = await fn(r);
    await save(db, r);
    return out;
  } finally {
    await db.del(lock);
  }
}

const player = (name: string): Player => ({
  id: id(), name, token: id(), writesFor: "", person: "", writtenBy: "", status: "playing", place: 0, questions: [], jokers: 0, hints: [], giveUp: null, unlocked: false,
});
const lang = (l: unknown): Lang => (l === "en" || l === "fr" ? l : "de");

export async function createRoom(db: Store, name: unknown, l: unknown, local: unknown) {
  const host = player(clean(name, 24) || "Host");
  for (;;) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => LETTERS[b % LETTERS.length]).join("");
    const room: Room = { code, lang: lang(l), local: local === true, host: host.id, phase: "lobby", players: [host], turn: "", game: 0, aiCalls: 0, updated: Date.now() };
    if (await db.set(k(code), room, { ex: TTL, nx: true })) return { code, pid: host.id, token: host.token };
  }
}

function addPlayer(r: Room, name: unknown) {
  if (r.phase !== "lobby") throw new GameError("started");
  if (r.players.length >= MAX_PLAYERS) throw new GameError("full");
  const n = clean(name, 24);
  if (!n) throw new GameError("bad_request");
  const p = player(r.players.some((x) => x.name.toLowerCase() === n.toLowerCase()) ? `${n} ${r.players.length + 1}` : n);
  r.players.push(p);
  return p;
}

export const joinRoom = (db: Store, code: string, name: unknown) =>
  mutate(db, code, (r) => {
    if (r.local) throw new GameError("not_found", 404); // a one-phone game has no other phones
    const p = addPlayer(r, name);
    return { code, pid: p.id, token: p.token };
  });

/** the caller, checked by token; in a one-phone game the host's phone may act `as` any player */
function actor(r: Room, pid: unknown, token: unknown, as?: unknown) {
  const me = r.players.find((p) => p.id === pid && p.token === token);
  if (!me) throw new GameError("not_found", 404);
  if (r.local && typeof as === "string" && me.id === r.host) return byId(r, as)?.id ?? me.id;
  return me.id;
}
const hostOnly = (r: Room, me: string) => {
  if (me !== r.host) throw new GameError("not_host", 403);
};
const spend = (r: Room, n: number) => {
  if (r.aiCalls + n > AI_CAP) throw new GameError("ai_limit", 429);
  r.aiCalls += n;
};

export type Action =
  | { type: "add"; name: string }
  | { type: "start" }
  | { type: "again" }
  | { type: "skip" }
  | { type: "write"; person: string; as?: string }
  | { type: "suggest" }
  | { type: "ask"; text: string; joker?: boolean; voice?: boolean; as?: string }
  | { type: "answer"; qid: string; answer: Answer; solved?: boolean }
  | { type: "joker"; as?: string }
  | { type: "giveup"; as?: string }
  | { type: "unlock"; target: string };

/** after-response work (the warmth meter): the route hands it to next/server's after() */
export type Later = (fn: () => Promise<unknown>) => void;

export async function act(db: Store, code: string, pid: unknown, token: unknown, a: Action, later: Later = (f) => void f()) {
  const r = await load(db, code);
  const me = actor(r, pid, token, "as" in a ? a.as : undefined);
  switch (a.type) {
    case "add":
      return mutate(db, code, (r) => {
        hostOnly(r, me);
        if (!r.local) throw new GameError("not_now");
        return { pid: addPlayer(r, a.name).id };
      });
    case "start":
    case "again":
      return mutate(db, code, (r) => {
        hostOnly(r, me);
        if (a.type === "start" && r.phase !== "lobby") throw new GameError("started");
        start(r);
      });
    case "skip":
      return mutate(db, code, (r) => {
        hostOnly(r, me);
        if (r.phase === "play") next(r);
      });
    case "write":
      return mutate(db, code, (r) => write(r, me, a.person));
    case "unlock":
      return mutate(db, code, (r) => unlock(r, me, a.target));
    case "answer":
      await mutate(db, code, (r) => answer(r, me, a.qid, a.answer === "no" ? "no" : "yes", !!a.solved));
      later(() => measure(db, code, a.qid));
      return {};
    case "suggest": {
      if (!ai.aiOn()) return { names: [] };
      await mutate(db, code, (r) => spend(r, 1));
      const taken = r.players.map((p) => p.person).filter(Boolean);
      return { names: await ai.suggestPeople(r.lang, taken).catch(() => []) };
    }
    case "ask":
      return askWithJev(db, r, me, a.text, { voice: !!a.voice, joker: !!a.joker });
    case "joker": {
      const p = byId(r, me);
      if (!p || r.turn !== me || p.status !== "playing" || r.phase !== "play") throw new GameError("not_your_turn");
      if (p.jokers < 1) throw new GameError("no_jokers");
      if (!ai.aiOn()) throw new GameError("no_ai", 503);
      const questions = await ai.joker(p, r.lang);
      if (!questions.length) throw new GameError("no_ai", 503);
      const best = questions.reduce((b, q, i) => (q.p > questions[b].p ? i : b), 0);
      return mutate(db, code, (r) => {
        spend(r, 2);
        const p = byId(r, me)!;
        if (p.jokers < 1) throw new GameError("no_jokers");
        p.jokers--;
        p.hints.push({ questions, best });
        return { questions, best };
      });
    }
    case "giveup": {
      const p = byId(r, me);
      if (!p || r.turn !== me || p.status !== "playing") throw new GameError("not_your_turn");
      const g = ai.aiOn() ? await ai.giveUpPick(p, r.lang).catch(() => null) : null;
      return mutate(db, code, (r) => {
        if (g) spend(r, 2);
        giveUp(r, me, g ?? { candidates: [], pick: -1 });
      });
    }
  }
  throw new GameError("bad_request");
}

/** a question goes in with Jev's verdict on it (is it a guess of this person, what's the true answer) */
type Verdict = { truth: number; guess: number } | null;
const judge = (text: string, person: string): Promise<Verdict> => (ai.aiOn() ? ai.judgeQuestion(text, person).catch(() => null) : Promise.resolve(null));

async function askWithJev(db: Store, r: Room, me: string, text: string, opts: { voice: boolean; joker: boolean }, early?: Promise<Verdict>) {
  const probe = structuredClone(r);
  const q = ask(probe, me, text, { ...opts, id: id() }); // throws now if it's not their turn, before any AI spend
  const verdict = await (early ?? judge(q.text, byId(r, me)!.person));
  return mutate(db, r.code, (r) => {
    if (verdict) spend(r, 1);
    const added = ask(r, me, q.text, { ...opts, id: q.id });
    Object.assign(added, verdict ?? {});
    return { qid: added.id };
  });
}

/** after an answer: Jev's warmth for the asker, written onto that question */
async function measure(db: Store, code: string, qid: string) {
  if (!ai.aiOn()) return;
  const r = await load(db, code);
  const p = r.players.find((p) => p.questions.some((q) => q.id === qid));
  if (!p) return;
  const w = await ai.warmth(p).catch(() => null);
  if (w === null) return;
  await mutate(db, code, (r) => {
    spend(r, 1);
    const q = r.players.flatMap((p) => p.questions).find((q) => q.id === qid);
    if (q) q.warmth = w;
  });
}

/**
 * hands-free: one line heard at the table. No open question → it may be the guesser's question (Luna tidies it, Jev
 * decides it is one, in parallel). An open question → Jev decides whether the table said yes, no, or neither.
 */
export async function hear(db: Store, code: string, pid: unknown, token: unknown, heard: string, later: Later) {
  const r = await load(db, code);
  const me = actor(r, pid, token);
  const line = clean(heard, 300);
  const guesser = byId(r, r.turn);
  if (!line || r.phase !== "play" || !guesser) return { heard: line, did: "nothing" as const };
  if (!r.local && me !== guesser.id) throw new GameError("not_your_turn"); // only the guesser's phone listens
  const open = pending(guesser);
  if (!open) {
    // Luna first: raw Swiss German fools a yes/no reading, its clean version doesn't
    const text = await ai.tidy(line, r.lang).catch(() => line);
    // is it a question, and Jev's verdict on it, at the same time: a verdict on chatter is thrown away (a tenth of a cent)
    const verdict = text ? judge(text, guesser.person) : Promise.resolve(null);
    const route = await ai.route("ask", line, "", text);
    await mutate(db, code, (r) => spend(r, 2));
    if (route.kind !== "question") return { heard: line, did: "chatter" as const };
    const { qid } = await askWithJev(db, await load(db, code), guesser.id, text, { voice: true, joker: false }, verdict);
    return { heard: line, did: "asked" as const, qid, text };
  }
  const route = await ai.route("answer", line, open.text);
  await mutate(db, code, (r) => spend(r, 1));
  if (route.kind !== "answer") return { heard: line, did: "chatter" as const };
  // the guesser's own phone hears the table's answer: act for the table, not as the guesser
  const by = r.players.find((p) => p.id !== guesser.id)?.id ?? me;
  await mutate(db, code, (r) => answer(r, by, open.id, route.answer));
  later(() => measure(db, code, open.id));
  return { heard: line, did: "answered" as const, answer: route.answer };
}

export async function view(db: Store, code: string, pid: unknown, token: unknown) {
  const r = await load(db, code);
  const me = actor(r, pid, token);
  return { ...viewFor(r, me), ai: ai.aiOn() };
}

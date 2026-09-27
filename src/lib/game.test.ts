import { test } from "node:test";
import assert from "node:assert/strict";
import { answer, ask, derange, giveUp, start, unlock, viewFor, write, type Room } from "./game";

const room = (n: number, local = false): Room => ({
  code: "ABCDE", lang: "de", local, host: "p0", phase: "lobby", turn: "", game: 0, aiCalls: 0, updated: 0,
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, token: `t${i}`, writesFor: "", person: "", writtenBy: "", status: "playing", place: 0, questions: [], jokers: 2, hints: [], giveUp: null, unlocked: false })),
});
const ready = (n: number, local = false) => {
  const r = room(n, local);
  start(r);
  for (const p of r.players) write(r, p.id, `Person for ${p.writesFor}`);
  return r;
};

test("derange never maps anyone to themselves", () => {
  for (let i = 0; i < 500; i++) {
    const xs = ["a", "b", "c", "d"].slice(0, 2 + (i % 3));
    derange(xs).forEach((y, j) => assert.notEqual(y, xs[j]));
  }
});

test("everyone writes for someone else; play starts when all persons are in", () => {
  const r = room(3);
  start(r);
  assert.equal(r.phase, "write");
  r.players.forEach((p) => assert.notEqual(p.writesFor, p.id));
  write(r, "p0", "Heidi");
  assert.equal(r.phase, "write");
  write(r, "p1", "Federer");
  write(r, "p2", "Curie");
  assert.equal(r.phase, "play");
  assert.equal(r.turn, "p0");
  const t = r.players.find((p) => p.id === r.players[0].writesFor)!;
  assert.equal(t.person, "Heidi");
  assert.equal(t.writtenBy, "p0");
});

test("yes keeps the turn, no passes it on, the asker can't answer themselves", () => {
  const r = ready(3);
  ask(r, "p0", "Bin ich eine Frau?", { id: "q1" });
  assert.throws(() => answer(r, "p0", "q1", "yes"), /not_you/);
  assert.throws(() => ask(r, "p0", "Noch eine?", { id: "q2" }), /pending/);
  answer(r, "p1", "q1", "yes");
  assert.equal(r.turn, "p0");
  ask(r, "p0", "Lebe ich?", { id: "q2" });
  assert.throws(() => answer(r, "p1", "q1", "no"), /stale/); // a late tap on the old question
  answer(r, "p1", "q2", "no");
  assert.equal(r.turn, "p1");
});

test("a yes to a guess solves it; places count up; the game ends when nobody is left", () => {
  const r = ready(2);
  const q = ask(r, "p0", "Bin ich Heidi?", { id: "q1" });
  q.guess = 0.9;
  answer(r, "p1", "q1", "yes");
  assert.equal(r.players[0].status, "solved");
  assert.equal(r.players[0].place, 1);
  assert.equal(r.turn, "p1");
  ask(r, "p1", "Bin ich echt?", { id: "q2" });
  answer(r, "p0", "q2", "yes", true); // "Erraten!" button
  assert.equal(r.players[1].place, 2);
  assert.equal(r.phase, "end");
});

test("giving up passes the turn and only the writer may unlock the card", () => {
  const r = ready(3);
  giveUp(r, "p0", { candidates: [{ name: "X", p: 1 }], pick: 0 });
  assert.equal(r.players[0].status, "gaveup");
  assert.equal(r.turn, "p1");
  const writer = r.players[0].writtenBy;
  const other = r.players.find((p) => p.id !== writer && p.id !== "p0")!.id;
  assert.throws(() => unlock(r, other, "p0"), /not_you/);
  unlock(r, writer, "p0");
  assert.equal(r.players[0].unlocked, true);
});

test("my own person stays hidden from me, never tokens", () => {
  const r = ready(3);
  const v = viewFor(r, "p0");
  assert.equal(v.players[0].person, "");
  assert.notEqual(v.players[1].person, "");
  assert.ok(v.players.every((p) => !("token" in p)));
  assert.notEqual(viewFor(ready(3, true), "p0").players[0].person, ""); // one phone: the table sees everything
});

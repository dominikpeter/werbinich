import { expect, test } from "@playwright/test";

// the server enforces the rules, not the buttons
test("tokens are checked, tokens never leak, own person is hidden", async ({ request }) => {
  const host = await (await request.post("/api/rooms", { data: { name: "A", lang: "de" } })).json();
  const b = await (await request.post(`/api/rooms/${host.code}`, { data: { type: "join", name: "B" } })).json();
  const bad = await request.get(`/api/rooms/${host.code}`, { headers: { "x-pid": host.pid, "x-token": "wrong" } });
  expect(bad.status()).toBe(404);
  const notHost = await request.post(`/api/rooms/${host.code}`, { data: { ...b, type: "start" } });
  expect(notHost.status()).toBe(403);
  await request.post(`/api/rooms/${host.code}`, { data: { ...host, type: "start" } });
  const v = await (await request.get(`/api/rooms/${host.code}`, { headers: { "x-pid": host.pid, "x-token": host.token } })).json();
  expect(JSON.stringify(v)).not.toContain(host.token);
  expect(JSON.stringify(v)).not.toContain(b.token);
  expect(v.players.find((p: { id: string }) => p.id === host.pid).writesFor).toBe(b.pid);
  const big = await request.post(`/api/rooms/${host.code}/hear`, { data: { ...host, audio: "x".repeat(700_000) } });
  expect(big.status()).toBe(413);
});

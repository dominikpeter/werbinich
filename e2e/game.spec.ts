import { expect, test, type Browser, type Page } from "@playwright/test";

// two real phones in one room: create, join by code, write, ask, answer, joker, solve, give up, reveal
async function phone(browser: Browser) {
  const { baseURL, ...device } = test.info().project.use;
  const ctx = await browser.newContext({ ...device, baseURL });
  return ctx.newPage();
}
const asker = async (pages: Page[]) => {
  for (const p of pages) if (await p.getByText("Du bist dran").isVisible()) return p;
  throw new Error("nobody's turn");
};
/** the mic is the default with AI on; the keyboard is one tap away */
async function typeQ(p: Page, q: string) {
  const box = p.getByRole("textbox", { name: "Frage stellen" });
  if (!(await box.isVisible())) await p.getByRole("button", { name: "keyboard" }).click();
  await box.fill(q);
  await p.getByRole("button", { name: "Fragen" }).click();
}
const other = (pages: Page[], p: Page) => pages.find((x) => x !== p)!;

test("a room of two: the whole game with joker, solve, give-up and reveal", async ({ browser }) => {
  const a = await phone(browser);
  const b = await phone(browser);
  await a.goto("/");
  await a.getByLabel("Dein Name").fill("Anna");
  await a.getByRole("button", { name: /Raum erstellen/ }).click();
  const code = (await a.getByTestId("room-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z]{5}$/);

  await b.goto("/");
  await b.getByLabel("Dein Name").fill("Beni");
  await b.getByLabel("Code").fill(code);
  await b.getByRole("button", { name: "Beitreten" }).click();
  await expect(a.getByTestId("players")).toContainText("Beni");
  await expect(b.getByText("Warte auf den Start")).toBeVisible();

  await a.getByRole("button", { name: "Los geht's" }).click();
  // each writes for the other; Luna's suggestions are one tap away
  await expect(a.getByRole("heading", { name: "Wer ist Beni?" })).toBeVisible();
  await a.getByRole("button", { name: /Luna/ }).click();
  await a.getByRole("button", { name: "Roger Federer" }).click();
  await a.getByRole("button", { name: "Fertig" }).click();
  await expect(a.getByText(/Warte, bis alle/)).toBeVisible();
  await b.getByLabel(/z\. B\./).fill("Heidi");
  await b.getByRole("button", { name: "Fertig" }).click();

  // Anna starts; she doesn't see her own person, Beni does
  await expect(a.getByText("Du bist dran")).toBeVisible();
  await expect(a.getByTestId("person")).toHaveCount(0);
  await expect(b.getByTestId("person")).toHaveText("Heidi");

  const pages = [a, b];
  const p = await asker(pages);
  await typeQ(p, "Bin ich eine Frau?");
  const table = other(pages, p);
  await expect(table.getByTestId("answer-panel")).toContainText("Bin ich eine Frau?");
  await expect(table.getByTestId("answer-panel")).toContainText("Jev meint");
  await table.getByRole("button", { name: "Ja", exact: true }).click();
  await expect(p.getByTestId("tree")).toContainText("Ja");
  // warmth arrives after the answer
  await expect(p.getByText(/Jev-Wärme/)).toBeVisible();

  // joker: Luna's five, Jev's pick on top; asking one marks it
  await p.getByRole("button", { name: /Joker/ }).click();
  await expect(p.getByTestId("joker")).toContainText("Lebe ich noch?");
  await p.getByTestId("joker").getByRole("button", { name: /Lebe ich noch/ }).click();
  await expect(p.getByRole("button", { name: /1 übrig/ })).toBeVisible();
  await table.getByRole("button", { name: "Nein", exact: true }).click();

  // "no" passed the turn: Beni asks now and guesses right; a yes to a Jev-recognised guess solves it
  await expect(b.getByText("Du bist dran")).toBeVisible();
  await typeQ(b, "Bin ich Roger Federer?");
  await a.getByRole("button", { name: "Ja", exact: true }).click();
  await expect(a.getByTestId("celebration")).toContainText("Roger Federer");

  // Anna gives up: the AI's guess and the answer show, then the game ends
  await expect(a.getByText("Du bist dran")).toBeVisible();
  await a.getByRole("button", { name: "Aufgeben" }).click();
  await a.getByRole("button", { name: "Wirklich aufgeben?" }).click();
  await expect(a.getByTestId("celebration")).toContainText("Hätte die KI es gewusst?");
  await expect(a.getByTestId("celebration")).toContainText("Heidi");
  await a.getByTestId("celebration").click();

  // the end: Beni's card is up, Anna's stays locked until Beni (who wrote it) reveals it
  await expect(b.getByRole("heading", { name: "Alle durch!" })).toBeVisible();
  await expect(b.getByTestId("cards")).toContainText("Platz 1");
  await expect(a.getByRole("button", { name: /Aufdecken/ })).toHaveCount(0);
  await b.getByText("Aufdecken").click();
  await expect(a.locator(".flip.open")).toHaveCount(2);
  await expect(a.getByRole("button", { name: "Nochmal" })).toBeVisible();
});

test("one phone: pass it for writing, the secret stays covered, voice lines are routed", async ({ page, request }) => {
  await page.goto("/");
  await page.getByLabel("Dein Name").fill("Dominik");
  await page.getByRole("button", { name: /Ein Handy/ }).click();
  for (const n of ["Anna", "Beni"]) {
    await page.getByLabel("Name hinzufügen").fill(n);
    await page.getByLabel("Name hinzufügen").press("Enter");
    await expect(page.getByTestId("players")).toContainText(n);
  }
  await page.getByRole("button", { name: "Los geht's" }).click();
  for (const person of ["Heidi", "Pippi", "Tell"]) {
    await expect(page.getByText("Gib das Handy an")).toBeVisible();
    await page.getByRole("button", { name: /^Ich bin/ }).click();
    await page.getByLabel(/z\. B\./).fill(person);
    await page.getByRole("button", { name: "Fertig" }).click();
  }
  await expect(page.getByTestId("guesser")).toHaveText("Dominik");
  // covered until held, and no Jev hint in plain sight
  await expect(page.getByTestId("person")).toHaveCount(0);
  await expect(page.getByText("Halten zum Anzeigen")).toBeVisible();

  // the table's ear: lines the phone heard (text stands in for audio here) are sorted by the AI
  const code = (await page.getByTestId("room-code").textContent())!.trim();
  const id = JSON.parse((await page.evaluate((c) => localStorage.getItem(`werbinich:room:${c}`), code))!);
  const hear = (text: string) => request.post(`/api/rooms/${code}/hear`, { data: { ...id, text } }).then((r) => r.json());
  expect((await hear("haha wer will noch ein Bier")).did).toBe("chatter");
  expect((await hear("Bin ich eine Frau?")).did).toBe("asked");
  await expect(page.getByTestId("answer-panel")).toContainText("Bin ich eine Frau?");
  await expect(page.getByText("Jev meint")).toHaveCount(0);
  expect(await hear("ja genau")).toMatchObject({ did: "answered", answer: "yes" });
  await expect(page.getByTestId("tree")).toContainText("Ja");
  expect(await hear("nein")).toMatchObject({ did: "chatter" }); // no open question: an answer means nothing
});

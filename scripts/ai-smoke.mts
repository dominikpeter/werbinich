// live check of every AI call against OpenRouter, Swiss German included. `just ai-smoke` (costs well under a cent)
import * as ai from "../src/lib/ai";
import type { Player } from "../src/lib/game";

const p = (person: string, qs: [string, "yes" | "no"][]): Player => ({ id: "x", name: "x", token: "", writesFor: "", person, writtenBy: "", status: "playing", place: 0, jokers: 2, hints: [], giveUp: null, unlocked: false, questions: qs.map(([text, answer], i) => ({ id: `${i}`, text, answer, voice: false, joker: false })) });
const t = async <T,>(label: string, f: () => Promise<T>) => {
  const s = Date.now();
  try { console.log(`${label} (${Date.now() - s}ms→`, JSON.stringify(await f()), `${Date.now() - s}ms)`); } catch (e) { console.log(label, "FAILED", e); }
};
const fed = p("Roger Federer", [["Bin ich eine Frau?", "no"], ["Lebe ich noch?", "yes"], ["Bin ich Sportler?", "yes"], ["Spiele ich Tennis?", "yes"]]);
await Promise.all([
  t("guess right", () => ai.judgeQuestion("Bin ich de Federer?", "Roger Federer")),
  t("guess wrong", () => ai.judgeQuestion("Bin ich Stan Wawrinka?", "Roger Federer")),
  t("property", () => ai.judgeQuestion("Bin ich Schwiizer?", "Roger Federer")),
  t("warmth 4 facts", () => ai.warmth(fed)),
  t("warmth 1 fact", () => ai.warmth(p("Roger Federer", [["Bin ich eine Frau?", "no"]]))),
  t("route ask CH", () => ai.route("ask", "bini e frau", "")),
  t("route chatter", () => ai.route("ask", "haha nei du bisch so luschtig, wer wott no es bier", "")),
  t("route answer jo", () => ai.route("answer", "jo, äuä scho", "Bin ich eine Frau?")),
  t("route answer nei", () => ai.route("answer", "nei nöd würklich", "Bin ich eine Frau?")),
  t("route answer unsure", () => ai.route("answer", "hmm weiss nöd, was meinsch du", "Bin ich eine Frau?")),
  t("tidy CH", () => ai.tidy("bini öpper wo no läbt", "de")),
  t("tidy CH 2", () => ai.tidy("hani scho mal en oscar gunne", "de")),
  t("joker", () => ai.joker(fed, "de")),
  t("giveup", () => ai.giveUpPick(fed, "de")),
  t("suggest", () => ai.suggestPeople("de", [])),
]);
for (const h of ["bini e frau", "bini en schauspieler", "isch mini person no am läbe", "chum ich us dr schwiiz", "haha wer wott no es bier", "nei du bisch z'langsam"]) {
  await t(`hear ${h}`, async () => { const c = await ai.tidy(h, "de"); return [c, await ai.route("ask", h, "", c)]; });
}

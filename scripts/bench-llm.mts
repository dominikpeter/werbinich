// LLM benchmark for the two jobs the game gives a chat model: the joker (5 good yes/no questions from the path so far)
// and giving up (5 people who fit the path). Quality: how often the real person is among the candidates, and whether the
// joker returns 5 fresh yes/no questions. `just bench-llm`; MODELS=a,b to pick.
const MODELS = (process.env.MODELS ?? [
  "openai/gpt-6-luna", "deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4-flash", "z-ai/glm-5.3-flash",
  "google/gemini-3.1-flash-lite", "google/gemini-3.5-flash-lite", "qwen/qwen3.5-plus-20260420", "~anthropic/claude-haiku-latest", "x-ai/grok-4.3",
].join(",")).split(",");

type Fact = [q: string, yes: boolean];
const SCENARIOS: { who: string; lang: string; facts: Fact[] }[] = [
  { who: "Roger Federer", lang: "de", facts: [["Bin ich eine Frau?", false], ["Lebe ich noch?", true], ["Bin ich Sportler?", true], ["Spiele ich Tennis?", true], ["Komme ich aus der Schweiz?", true]] },
  { who: "Marie Curie", lang: "de", facts: [["Bin ich eine Frau?", true], ["Lebe ich noch?", false], ["Bin ich Wissenschaftlerin?", true], ["Habe ich einen Nobelpreis?", true]] },
  { who: "Harry Potter", lang: "en", facts: [["Am I real?", false], ["Am I from a book?", true], ["Am I a wizard?", true], ["Am I a child in the story?", true], ["Am I the main character?", true]] },
  { who: "Heidi", lang: "de", facts: [["Bin ich echt?", false], ["Komme ich aus einem Buch?", true], ["Bin ich ein Mädchen?", true], ["Lebe ich in den Bergen?", true]] },
  { who: "Elon Musk", lang: "en", facts: [["Am I a woman?", false], ["Am I alive?", true], ["Am I a businessperson?", true], ["Do I own a car company?", true], ["Am I involved in space travel?", true]] },
];
const path = (f: Fact[]) => f.map(([q, a], i) => `${i + 1}. ${q} → ${a ? "yes" : "no"}`).join("\n");

async function chat(model: string, system: string, prompt: string, schema: object) {
  const body = (effort: string) => JSON.stringify({
    model, reasoning: { effort }, temperature: 0.7, max_tokens: 600,
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    response_format: { type: "json_schema", json_schema: { name: "out", strict: true, schema } },
  });
  const t = Date.now();
  let r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" }, body: body("none") });
  if (r.status === 400) r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" }, body: body("low") });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  return { out: JSON.parse(j.choices[0].message.content.replace(/^```(json)?|```$/g, "")), ms: Date.now() - t, cost: j.usage?.cost ?? 0 };
}

const list = (key: string) => ({ type: "object", properties: { [key]: { type: "array", items: { type: "string" } } }, required: [key], additionalProperties: false });
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

async function run(model: string) {
  const out = { model, jokerOk: 0, hits: 0, n: 0, ms: [] as number[], cost: 0, err: "" };
  await Promise.all(SCENARIOS.map(async (s) => {
    try {
      const j = await chat(model, `You help a player of "Who am I?" (they must find out which famous person or character they are by yes/no questions). Write in the language of the questions.`,
        `Questions so far:\n${path(s.facts)}\n\nSuggest 5 new yes/no questions that would narrow it down the most. Don't repeat what is already known. Short questions in first person ("Am I ...?").`, list("questions"));
      const qs: string[] = j.out.questions ?? [];
      if (qs.length === 5 && qs.every((q) => q.trim().endsWith("?"))) out.jokerOk++;
      const g = await chat(model, `You play "Who am I?". From yes/no answers, name the famous people or characters that fit best.`,
        `Answers so far:\n${path(s.facts)}\n\nName the 5 most likely people or characters, most likely first. Names only.`, list("names"));
      if ((g.out.names ?? []).some((n: string) => norm(n).includes(norm(s.who.split(" ").at(-1)!)))) out.hits++;
      out.ms.push(j.ms, g.ms);
      out.cost += j.cost + g.cost;
      out.n++;
    } catch (e) {
      out.err = String(e).slice(0, 100);
    }
  }));
  return out;
}

const res = await Promise.all(MODELS.map(run));
const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
res.sort((a, b) => b.hits + b.jokerOk - (a.hits + a.jokerOk) || med(a.ms) - med(b.ms));
console.log("model".padEnd(34), "joker ok", "person found", "median ms", "cost/10 calls");
for (const r of res) console.log(r.model.padEnd(34), `${r.jokerOk}/${SCENARIOS.length}`.padStart(8), `${r.hits}/${SCENARIOS.length}`.padStart(12), String(med(r.ms)).padStart(9), `$${r.cost.toFixed(5)}`, r.err);

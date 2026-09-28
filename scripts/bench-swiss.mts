// Swiss German benchmark, end to end as the game runs it: dialect lines spoken by TTS voices told to speak Zurich
// German → speech-to-text → Luna tidies it → Jev routes it. A line scores when the result means what the player meant
// (Jev judges "same question?"; answers must come out yes/no/none). `just bench-swiss`; STT=a,b CHAT=a,b LANGS=de,none.
// ponytail: TTS dialect is a stand-in for real party recordings; drop real .wav files into test-results/bench-swiss/real/ to add them
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import * as ai from "../src/lib/ai";

const KEY = process.env.OPENROUTER_API_KEY!;
const dir = "test-results/bench-swiss";
mkdirSync(dir, { recursive: true });

type Line = { ch: string; want: string; kind: "question" | "chatter" | "yes" | "no" | "none" };
const LINES: Line[] = [
  { ch: "Bini e Frau?", want: "Bin ich eine Frau?", kind: "question" },
  { ch: "Bini öpper wo no läbt?", want: "Lebe ich noch?", kind: "question" },
  { ch: "Chumi us dr Schwiiz?", want: "Komme ich aus der Schweiz?", kind: "question" },
  { ch: "Bini en Schauspieler?", want: "Bin ich ein Schauspieler?", kind: "question" },
  { ch: "Hani scho mal en Oscar gwunne?", want: "Habe ich schon einmal einen Oscar gewonnen?", kind: "question" },
  { ch: "Bini en Sportler?", want: "Bin ich ein Sportler?", kind: "question" },
  { ch: "Machi Musig?", want: "Mache ich Musik?", kind: "question" },
  { ch: "Bini älter als füfzgi?", want: "Bin ich älter als fünfzig?", kind: "question" },
  { ch: "Bini us emne Film oder emne Buech?", want: "Komme ich aus einem Film oder einem Buch?", kind: "question" },
  { ch: "Bini de Roger Federer?", want: "Bin ich Roger Federer?", kind: "question" },
  { ch: "Hani blondi Haar?", want: "Habe ich blonde Haare?", kind: "question" },
  { ch: "Bini en Politiker?", want: "Bin ich ein Politiker?", kind: "question" },
  { ch: "Isch mini Person es Tier?", want: "Bin ich ein Tier?", kind: "question" },
  { ch: "Kennt mi jedes Chind?", want: "Kennt mich jedes Kind?", kind: "question" },
  { ch: "Hey, wer wott no es Bier?", want: "", kind: "chatter" },
  { ch: "Du bisch so langsam, mach emal vorwärts!", want: "", kind: "chatter" },
  { ch: "Jo, äuä scho.", want: "yes", kind: "yes" },
  { ch: "Nei, sicher nöd.", want: "no", kind: "no" },
  { ch: "Jä, genau!", want: "yes", kind: "yes" },
  { ch: "Nöd würkli.", want: "no", kind: "no" },
  { ch: "Hmm, weiss nöd so rächt.", want: "none", kind: "none" },
];
const VOICES = [
  { id: "gemini-kore", model: "google/gemini-3.8-flash-tts", voice: "Kore", pcm: true },
  { id: "gemini-puck", model: "google/gemini-3.8-flash-tts", voice: "Puck", pcm: true },
  { id: "fish", model: "fish-audio/s2-pro", voice: "", pcm: false },
];
const STT = (process.env.STT ?? "openai/gpt-4o-mini-transcribe,openai/gpt-transcribe,openai/gpt-4o-transcribe,google/gemini-3.5-transcribe,openai/whisper-large-v3-turbo,qwen/qwen3-asr-flash-2026-02-10,x-ai/grok-stt-1.0,mistralai/voxtral-mini-transcribe,deepgram/nova-3").split(",");
const LANGS = (process.env.LANGS ?? "de,none").split(",");
const CHAT = (process.env.CHAT ?? "openai/gpt-6-luna").split(",");

async function speak(v: (typeof VOICES)[number], text: string, file: string) {
  if (existsSync(file)) return;
  const body = v.pcm
    ? { model: v.model, input: text, voice: v.voice, response_format: "pcm", provider: { options: { "google-ai-studio": { speech_metadata: { style: "casual native Zurich Swiss German dialect speaker at a party" } } } } }
    : { model: v.model, input: text, response_format: "mp3" }; // fish reads everything aloud: no stage directions
  let r: Response;
  // new OpenRouter accounts get 20 TTS calls a minute: wait and retry
  for (let k = 0; ; k++) {
    r = await fetch("https://openrouter.ai/api/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status !== 429 || k > 8) break;
    await new Promise((res) => setTimeout(res, 15_000));
  }
  if (!r.ok) throw new Error(`tts ${v.id} ${r.status} ${await r.text()}`);
  const raw = `${file}.raw`;
  writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...(v.pcm ? ["-f", "s16le", "-ar", "24000", "-ac", "1"] : []), "-i", raw, "-ar", "16000", "-ac", "1", file]);
}

// a little pool: providers throttle a burst of a few hundred calls
async function pool<T>(n: number, jobs: (() => Promise<T>)[]) {
  const out: T[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < jobs.length) {
      const j = i++;
      out[j] = await jobs[j]();
    }
  }));
  return out;
}

async function same(got: string, want: string) {
  const r = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "~typesafe/jev-latest", state: { expected: want, got }, questions: { same: { type: "noul", instructions: "In a 'Who am I?' game, does `got` ask the same yes/no question as `expected` (same meaning; wording may differ)?", criteria: { true: "Same question, the table would answer it the same way.", false: "A different question, a mistranscription, or missing." } } } }),
  });
  return ((await r.json()).answers?.same?.noul ?? 0) > 0.5;
}

// 1. audio, once (cached on disk)
const clips: { voice: string; line: Line; b64: string }[] = [];
for (const v of VOICES)
  await pool(4, LINES.map((l, i) => async () => {
    const f = `${dir}/${v.id}-${i}.wav`;
    await speak(v, l.ch, f);
    clips.push({ voice: v.id, line: l, b64: readFileSync(f).toString("base64") });
  }));
if (existsSync(`${dir}/real`)) for (const f of readdirSync(`${dir}/real`)) console.log("real clip (unscored, printed):", f);

// 2. transcripts for every STT × language (cheap), then Luna and Jev once per distinct transcript (Luna is rate limited)
type Row = { stt: string; lang: string; chat: string; ok: boolean; ms: number; heard: string; out: string; line: Line; voice: string };
const memo = new Map<string, Promise<unknown>>();
const once = <T,>(k: string, f: () => Promise<T>) => (memo.get(k) ?? memo.set(k, retry(f)).get(k)!) as Promise<T>;
async function retry<T>(f: () => Promise<T>): Promise<T> {
  for (let k = 0; ; k++) {
    try {
      return await f();
    } catch (e) {
      if (k > 6 || !String(e).includes("429")) throw e;
      await new Promise((res) => setTimeout(res, 5000 * (k + 1)));
    }
  }
}
const heardJobs = STT.flatMap((stt) => LANGS.flatMap((lang) => clips.map((c) => async () => {
  const t = Date.now();
  const heard = await retry(() => ai.transcribe(c.b64, "wav", lang === "none" ? null : "de", [stt])).catch((e) => `ERR ${String(e).slice(0, 40)}`);
  return { stt, lang, c, heard, ms: Date.now() - t };
})));
const heardRows = await pool(10, heardJobs);
const jobs = CHAT.flatMap((chat) => heardRows.map((h) => async (): Promise<Row> => {
  const { c, heard } = h;
  let out = "", ok = false;
  try {
    if (c.line.kind === "question" || c.line.kind === "chatter") {
      out = await once(`t:${chat}:${heard}`, () => ai.tidy(heard, "de", [chat]));
      const route = out ? await once(`r:${heard}:${out}`, () => ai.route("ask", heard, "", out)) : { kind: "chatter" };
      ok = c.line.kind === "chatter" ? route.kind === "chatter" : route.kind === "question" && (await once(`s:${out}:${c.line.want}`, () => same(out, c.line.want)));
    } else {
      const r = await once(`a:${heard}`, () => ai.route("answer", heard, "Bin ich eine Frau?"));
      out = r.kind === "answer" ? r.answer : "none";
      ok = out === c.line.want;
    }
  } catch (e) {
    out = `ERR ${String(e).slice(0, 60)}`;
  }
  return { stt: h.stt, lang: h.lang, chat, ok, ms: h.ms, heard, out, line: c.line, voice: c.voice };
}));
const rows = await pool(4, jobs);
console.log("distinct AI calls after dedupe:", memo.size);

// 3. score
const groups = new Map<string, Row[]>();
for (const r of rows) groups.set(`${r.stt} lang=${r.lang} ${r.chat}`, [...(groups.get(`${r.stt} lang=${r.lang} ${r.chat}`) ?? []), r]);
const table = [...groups].map(([k, rs]) => ({ k, ok: rs.filter((r) => r.ok).length, n: rs.length, ms: [...rs.map((r) => r.ms)].sort((a, b) => a - b)[rs.length >> 1] })).sort((a, b) => b.ok - a.ok || a.ms - b.ms);
console.log("pipeline (STT → Luna → Jev)".padEnd(72), "correct", "STT median ms");
for (const t of table) console.log(t.k.padEnd(72), `${t.ok}/${t.n}`.padStart(7), String(t.ms).padStart(9));
writeFileSync(`${dir}/results.json`, JSON.stringify(rows, null, 1));
if (process.env.VERBOSE) for (const r of rows.filter((r) => !r.ok && r.stt === table[0].k.split(" ")[0])) console.log(`  ✗ [${r.voice}] ${r.line.ch} → heard "${r.heard}" → ${r.out || "(nothing)"}`);

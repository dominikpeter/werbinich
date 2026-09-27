// Speech-to-text benchmark on OpenRouter: game phrases spoken by macOS voices (DE/EN/FR), sent as webm/opus like Chrome
// records them. Scores word accuracy, latency and cost per model. `just bench-stt` (needs ffmpeg, macOS `say`).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const dir = "test-results/bench-stt";
mkdirSync(dir, { recursive: true });
const MODELS = (process.env.MODELS ?? [
  "openai/gpt-4o-mini-transcribe", "openai/gpt-4o-transcribe", "openai/gpt-transcribe", "openai/whisper-large-v3-turbo",
  "openai/whisper-large-v3", "google/gemini-3.5-transcribe", "mistralai/voxtral-mini-transcribe", "mistralai/voxtral-mini-3b-2507",
  "qwen/qwen3-asr-flash-2026-02-10", "qwen/qwen3-asr-1.7b", "deepgram/nova-3", "assemblyai/universal-3-5-pro",
  "x-ai/grok-stt-1.0", "nvidia/parakeet-tdt-0.6b-v3", "meta/muse-voice-transcribe-1.0",
].join(",")).split(",");

const CLIPS: [lang: string, voice: string, text: string][] = [
  ["de", "Anna", "Bin ich eine Frau?"],
  ["de", "Anna", "Bin ich Roger Federer?"],
  ["de", "Flo (German (Germany))", "Lebe ich noch und komme ich aus der Schweiz?"],
  ["de", "Eddy (German (Germany))", "Nein, eher nicht."],
  ["de", "Anna", "Ja, genau."],
  ["de", "Flo (German (Germany))", "Habe ich schon mal einen Oscar gewonnen?"],
  ["en", "Samantha", "Am I a fictional character?"],
  ["en", "Daniel", "Am I Taylor Swift?"],
  ["en", "Samantha", "Nope."],
  ["fr", "Eddy (French (France))", "Est-ce que je suis un chanteur?"],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
// word accuracy: 1 - word edit distance / reference length
function accuracy(ref: string, hyp: string) {
  const a = norm(ref), b = norm(hyp);
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return Math.max(0, 1 - d[a.length][b.length] / a.length);
}

const clips = CLIPS.map(([lang, voice, text], i) => {
  const base = `${dir}/clip${i}`;
  execFileSync("say", ["-v", voice, "-o", `${base}.aiff`, text]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${base}.aiff`, "-c:a", "libopus", "-b:a", "32k", `${base}.webm`]);
  return { lang, text, data: readFileSync(`${base}.webm`).toString("base64") };
});

async function run(model: string) {
  const rows = await Promise.all(clips.map(async (c) => {
    const t = Date.now();
    try {
      const r = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, language: c.lang, input_audio: { data: c.data, format: "webm" } }),
      });
      const j = await r.json();
      if (!r.ok) return { ok: false, ms: Date.now() - t, acc: 0, cost: 0, text: `ERR ${r.status} ${JSON.stringify(j).slice(0, 80)}` };
      return { ok: true, ms: Date.now() - t, acc: accuracy(c.text, j.text ?? ""), cost: j.usage?.cost ?? 0, text: j.text };
    } catch (e) {
      return { ok: false, ms: Date.now() - t, acc: 0, cost: 0, text: String(e) };
    }
  }));
  const ok = rows.filter((r) => r.ok);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return { model, ok: ok.length, acc: avg(rows.map((r) => r.acc)), ms: avg(ok.map((r) => r.ms)), cost: rows.reduce((a, r) => a + r.cost, 0), rows };
}

const results = await Promise.all(MODELS.map(run));
results.sort((a, b) => b.acc - a.acc || a.ms - b.ms);
console.log("model".padEnd(40), "ok", "accuracy", "avg ms", "cost/10 clips");
for (const r of results) console.log(r.model.padEnd(40), `${r.ok}/${clips.length}`, (r.acc * 100).toFixed(1).padStart(7) + "%", String(Math.round(r.ms)).padStart(6), "$" + r.cost.toFixed(6));
if (process.env.VERBOSE) for (const r of results) console.log(`\n${r.model}\n` + r.rows.map((x, i) => `  ${CLIPS[i][2]} → ${x.text}`).join("\n"));

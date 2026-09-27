import { after } from "next/server";
import { transcribe, type AudioFormat } from "@/lib/ai";
import { hear } from "@/lib/room";
import { clean, handle } from "../../handle";

const FORMATS: AudioFormat[] = ["webm", "m4a", "mp3", "wav", "ogg", "aac"];
export const maxDuration = 30;

// POST { pid, token, audio (base64), format } → what was heard and what it did (asked / answered / chatter).
// { text } instead of audio skips speech-to-text (typed lines, and the e2e tests).
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = clean((await params).code);
  return handle(async (db) => {
    const b = await req.json();
    const format = FORMATS.includes(b.format) ? b.format : "webm";
    const lang = b.lang === "en" || b.lang === "fr" ? b.lang : "de";
    const text = typeof b.audio === "string" && b.audio ? await transcribe(b.audio, format, lang) : String(b.text ?? "");
    return hear(db, code, b.pid, b.token, text, after);
  }, req, 600_000); // ~15 s of opus at 32 kbit/s is ~80 KB, base64 a third more
}

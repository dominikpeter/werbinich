import { GameError } from "@/lib/game";
import { db, persistent } from "@/lib/store";
import type { Store } from "@/lib/store";

/** JSON in and out for the room routes: body size bound, game errors → status codes */
export async function handle(fn: (db: Store) => Promise<unknown>, req?: Request, maxBody = 20_000) {
  if (!persistent && process.env.VERCEL) return Response.json({ error: "no_storage" }, { status: 503 });
  // browsers always send a length with a JSON body; none (chunked) is refused rather than read unbounded
  if (req && !(Number(req.headers.get("content-length")) <= maxBody)) return Response.json({ error: "too_big" }, { status: 413 });
  try {
    return Response.json((await fn(db)) ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof GameError) return Response.json({ error: e.code }, { status: e.status });
    if (e instanceof SyntaxError) return Response.json({ error: "bad_request" }, { status: 400 });
    console.error(e);
    return Response.json({ error: "offline" }, { status: 500 });
  }
}

export const clean = (code: string) => code.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);

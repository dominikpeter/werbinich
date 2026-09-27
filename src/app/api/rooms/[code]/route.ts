import { after } from "next/server";
import { act, joinRoom, view } from "@/lib/room";
import { clean, handle } from "../handle";

// GET (x-pid / x-token headers, kept out of URLs and logs) → this player's view, polled by every phone
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = clean((await params).code);
  return handle((db) => view(db, code, req.headers.get("x-pid"), req.headers.get("x-token")));
}

// POST { type: "join", name } or { pid, token, type, ...action }
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = clean((await params).code);
  return handle(async (db) => {
    const { pid, token, ...a } = await req.json();
    if (a.type === "join") return joinRoom(db, code, a.name);
    return act(db, code, pid, token, a, after); // the warmth meter runs after the answer went out
  }, req);
}

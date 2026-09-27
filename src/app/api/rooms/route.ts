import { createRoom } from "@/lib/room";
import { handle } from "./handle";

// POST { name, lang, local } → { code, pid, token } of the host
export async function POST(req: Request) {
  return handle(async (db) => {
    const b = await req.json();
    return createRoom(db, b?.name, b?.lang, b?.local);
  }, req);
}

// browser side of rooms: who I am in each room, and calls to /api/rooms
import type { Lang } from "./i18n";

export type Identity = { pid: string; token: string };
const idKey = (code: string) => `werbinich:room:${code}`;

export function loadIdentity(code: string): Identity | null {
  try {
    return JSON.parse(localStorage.getItem(idKey(code)) ?? "null");
  } catch {
    return null;
  }
}
/** this phone has been in a game: the install hint waits for that */
export const PLAYED_KEY = "werbinich:played";

export function saveIdentity(code: string, id: Identity) {
  try {
    localStorage.setItem(idKey(code), JSON.stringify(id));
    localStorage.setItem(PLAYED_KEY, "1");
  } catch {}
}

export const LANG_KEY = "werbinich:lang";
export const NAME_KEY = "werbinich:name";
export const getLang = (): Lang => {
  try {
    const l = localStorage.getItem(LANG_KEY);
    return l === "en" || l === "fr" ? l : "de";
  } catch {
    return "de";
  }
};

export class ApiError extends Error {}

export async function api<T>(path: string, body?: unknown, id?: Identity | null): Promise<T> {
  const res = await fetch(`/api/rooms${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? { "x-pid": id?.pid ?? "", "x-token": id?.token ?? "" } : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify({ ...(id ?? {}), ...(body as object) }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "offline");
  return data as T;
}

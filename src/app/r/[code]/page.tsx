"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, loadIdentity, NAME_KEY, saveIdentity, type Identity } from "@/lib/client";
import type { View } from "@/lib/game";
import type { Key } from "@/lib/i18n";
import { Btn, useLang } from "@/components/ui";
import { SettingsButton } from "@/components/Settings";
import { BackButton } from "@/components/Back";
import { Lobby } from "@/components/Lobby";
import { Write } from "@/components/Write";
import { Celebrations, Play } from "@/components/Play";
import { End } from "@/components/End";

export type RoomView = View & { ai: boolean };
export type Act = (body: Record<string, unknown>) => Promise<unknown>;

// every phone polls its own view; a move refreshes right away
const POLL_MS = 1200;

export default function RoomPage() {
  const code = String(useParams().code).toUpperCase();
  const { t } = useLang();
  const [id, setId] = useState<Identity | null | undefined>(undefined);
  const [view, setView] = useState<RoomView | null>(null);
  const [err, setErr] = useState("");

  // identity comes from localStorage, which only exists after mount
  useEffect(() => setId(loadIdentity(code)), [code]); // eslint-disable-line react-hooks/set-state-in-effect

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setView(await api<RoomView>(`/${code}`, undefined, id));
      setErr("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "offline");
    }
  }, [code, id]);

  useEffect(() => {
    if (!id) return;
    const first = setTimeout(refresh, 0);
    const iv = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    return () => (clearTimeout(first), clearInterval(iv));
  }, [id, refresh]);

  const act: Act = useCallback(async (body) => {
    try {
      const r = await api(`/${code}`, body, id);
      await refresh();
      return r;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "offline");
      throw e;
    }
  }, [code, id, refresh]);

  if (id === undefined) return null;
  if (!id) return <JoinHere code={code} onJoined={setId} />;
  if (!view) return <Center>{err ? <p className="text-no">{t(err as Key)}</p> : <Spinner />}</Center>;

  const Phase = { lobby: Lobby, write: Write, play: Play, end: End }[view.phase];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-4">
      <header className="flex items-center justify-between py-2 font-mono text-sm text-muted">
        <BackButton view={view} act={act} />
        <span className="tracking-code" data-testid="room-code">{code}</span>
        <SettingsButton room={code} />
      </header>
      <Celebrations view={view} />
      <Phase view={view} act={act} code={code} id={id} refresh={refresh} />
      {err && err !== "stale" && <p className="mt-3 text-center text-xs text-no" role="alert">{err}</p>}
    </main>
  );
}

export type PhaseProps = { view: RoomView; act: Act; code: string; id: Identity; refresh: () => Promise<void> };

function JoinHere({ code, onJoined }: { code: string; onJoined: (id: Identity) => void }) {
  const { t } = useLang();
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : (localStorage.getItem(NAME_KEY) ?? "")));
  const [err, setErr] = useState("");
  const join = async () => {
    try {
      localStorage.setItem(NAME_KEY, name.trim());
      const r = await api<Identity>(`/${code}`, { type: "join", name });
      saveIdentity(code, r);
      onJoined(r);
    } catch (e) {
      setErr(t((e as Error).message as Key));
    }
  };
  return (
    <Center>
      <p className="font-mono tracking-code text-muted">{code}</p>
      <h1 className="font-display text-4xl font-bold">Wer bin ich?</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourName")} aria-label={t("yourName")} maxLength={24} className="glass w-full rounded-2xl px-4 py-3.5 text-lg outline-none" />
      <Btn className="w-full" disabled={!name.trim()} onClick={join}>{t("join")}</Btn>
      {err && <p className="text-sm text-no">{err}</p>}
    </Center>
  );
}

export const Center = ({ children }: { children: React.ReactNode }) => <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6">{children}</main>;
export const Spinner = () => <div className="size-8 animate-spin rounded-full border-2 border-line border-t-jev" />;

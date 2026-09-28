"use client";
import { useEffect, useState } from "react";
import { Crown, Plus } from "lucide-react";
import type { PhaseProps } from "@/app/r/[code]/page";
import { Btn, useLang } from "./ui";

export function Lobby({ view, act, code }: PhaseProps) {
  const { t } = useLang();
  const [qr, setQr] = useState("");
  const [name, setName] = useState("");
  const host = view.me === view.host;

  useEffect(() => {
    // loaded only here: the QR library stays out of every other screen's bundle
    if (!view.local) import("qrcode").then((m) => (m.default ?? m).toDataURL(`${location.origin}/r/${code}`, { margin: 1, width: 360, color: { dark: "#0b0a12", light: "#f4f1ff" } })).then(setQr);
  }, [code, view.local]);

  const add = async () => {
    if (!name.trim()) return;
    await act({ type: "add", name });
    setName("");
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      {!view.local && (
        <section className="glass glow-jev flex flex-col items-center gap-3 rounded-3xl p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt={t("shareCode")} width={176} height={176} className="size-44 rounded-2xl" />}
          <p className="font-mono text-4xl font-semibold tracking-code">{code}</p>
          <p className="text-sm text-muted">{t("shareCode")}</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("players")} <span className="font-normal text-muted">{view.players.length}</span></h2>
        <p className="text-sm text-muted">{view.local && view.players.length < 2 ? t("addHint") : t("turnOrder")}</p>
        <ol className="mt-1 flex flex-col gap-2" data-testid="players">
          {view.players.map((p, i) => (
            <li key={p.id} className="pop glass flex min-h-14 items-center gap-3 rounded-2xl px-4 text-lg font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-raised font-mono text-sm text-muted">{i + 1}</span>
              {p.name}
              {p.id === view.host && <Crown className="ml-auto size-4 text-gold" aria-label="host" />}
            </li>
          ))}
        </ol>
        {view.local && host && (
          <form onSubmit={(e) => (e.preventDefault(), add())} className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("addPlayer")} aria-label={t("addPlayer")} maxLength={24} enterKeyHint="done" className="min-h-14 w-0 flex-1 rounded-2xl border border-line bg-canvas px-4 text-lg outline-none focus:border-jev" />
            <Btn tone="ghost" type="submit" className="min-h-14" aria-label={t("add")}><Plus className="size-5" /></Btn>
          </form>
        )}
      </section>

      <div className="mt-auto">
        {host ? (
          <Btn className="min-h-16 w-full text-xl" tone="gold" disabled={view.players.length < 2} onClick={() => act({ type: "start" })}>
            {view.players.length < 2 ? t("needTwo") : t("start")}
          </Btn>
        ) : (
          <p className="animate-pulse text-center text-muted">{t("waitHost")}</p>
        )}
      </div>
    </div>
  );
}

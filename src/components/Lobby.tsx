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
    if (!view.local) import("qrcode").then((QRCode) => QRCode.toDataURL(`${location.origin}/r/${code}`, { margin: 1, width: 360, color: { dark: "#0b0a12", light: "#f4f1ff" } })).then(setQr);
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
          {qr && <img src={qr} alt="QR" className="size-44 rounded-2xl" />}
          <p className="font-mono text-4xl font-semibold tracking-code">{code}</p>
          <p className="text-xs text-muted">{t("shareCode")}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">{t("players")} · {view.players.length}</h2>
        <ul className="flex flex-wrap gap-2" data-testid="players">
          {view.players.map((p) => (
            <li key={p.id} className="pop glass flex items-center gap-1.5 rounded-full px-3.5 py-2 font-semibold">
              {p.id === view.host && <Crown className="size-3.5 text-gold" />}
              {p.name}
            </li>
          ))}
        </ul>
      </section>

      {view.local && host && (
        <form onSubmit={(e) => (e.preventDefault(), add())} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("addPlayer")} aria-label={t("addPlayer")} maxLength={24} className="glass w-0 flex-1 rounded-2xl px-4 py-3 outline-none" />
          <Btn tone="ghost" type="submit" aria-label={t("add")}><Plus className="size-5" /></Btn>
        </form>
      )}

      <div className="mt-auto">
        {host ? (
          <Btn className="w-full py-4 text-lg" tone="gold" disabled={view.players.length < 2} onClick={() => act({ type: "start" })}>
            {view.players.length < 2 ? t("needTwo") : t("start")}
          </Btn>
        ) : (
          <p className="animate-pulse text-center text-muted">{t("waitHost")}</p>
        )}
      </div>
    </div>
  );
}

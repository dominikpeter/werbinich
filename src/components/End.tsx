"use client";
import { useState } from "react";
import { Lock, RotateCcw, Sparkles, Star } from "lucide-react";
import type { PhaseProps } from "@/app/r/[code]/page";
import { Tree } from "./Tree";
import { Btn, useLang } from "./ui";

/** everyone's card: solved ones turn face up, the rest wait for their writer to reveal them. Tap a card for its path. */
export function End({ view, act }: PhaseProps) {
  const { t } = useLang();
  const ranked = [...view.players].sort((a, b) => (a.place || 99) - (b.place || 99) || a.questions.length - b.questions.length);
  const [pick, setPick] = useState(ranked[0]?.id ?? "");
  const chosen = view.players.find((p) => p.id === pick);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="rise text-center">
        <h1 className="font-display text-4xl font-bold">{t("end")}</h1>
        <p className="text-sm text-muted">{t("endSub")}</p>
      </div>

      <ul className="grid grid-cols-2 gap-3" data-testid="cards">
        {ranked.map((p, i) => {
          const open = p.status === "solved" || p.unlocked;
          const mine = p.writtenBy === view.me || (view.local && view.me === view.host);
          const writer = view.players.find((x) => x.id === p.writtenBy)?.name ?? "";
          return (
            <li key={p.id} className={`flip pop ${open ? "open" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
              <div className="inner">
                {/* face down */}
                <div onClick={() => setPick(p.id)} className={`face glass flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-3 ${pick === p.id ? "glow-jev" : ""}`}>
                  <Lock className="size-6 text-muted" />
                  <span className="font-display text-lg font-bold">{p.name}</span>
                  <span className="text-xs text-muted">{t("locked")}</span>
                  {mine && !open && (
                    <button onClick={(e) => (e.stopPropagation(), act({ type: "unlock", target: p.id }))} className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-gold-ink">
                      {t("unlock")}
                    </button>
                  )}
                </div>
                {/* face up */}
                <button onClick={() => setPick(p.id)} className={`face back flex h-40 flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center ${p.status === "solved" ? "bg-gold text-gold-ink" : "glass"} ${pick === p.id ? "glow-jev" : ""}`}>
                  <span className="text-xs font-semibold opacity-70">{p.name}</span>
                  <span className="font-display text-xl leading-tight font-bold" data-testid="card-person">{p.person}</span>
                  <span className="mt-1 font-mono text-2xs opacity-80">
                    {p.status === "solved" ? <><Star className="inline size-3" fill="currentColor" /> {t("place", { n: p.place })} · </> : `${t("gaveUp")} · `}
                    {t("questions", { n: p.questions.length })}
                  </span>
                  <span className="text-2xs opacity-60">{t("writtenBy", { name: writer })}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {chosen && (
        <section className="rise glass rounded-3xl p-3" key={chosen.id}>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted">{t("pathOf", { name: chosen.name })}</h2>
          <Tree questions={chosen.questions} end={chosen.status} person={chosen.status === "solved" || chosen.unlocked ? chosen.person : ""} />
          {chosen.giveUp && chosen.giveUp.pick >= 0 && (
            <p className="mt-2 px-1 font-mono text-xs text-jev">
              <Sparkles className="mr-1 inline size-3" />
              {t("jevPick")}: {chosen.giveUp.candidates[chosen.giveUp.pick]?.name} ({Math.round((chosen.giveUp.candidates[chosen.giveUp.pick]?.p ?? 0) * 100)}%)
            </p>
          )}
        </section>
      )}

      {view.me === view.host && (
        <Btn tone="gold" className="mt-auto py-4 text-lg" onClick={() => act({ type: "again" })}>
          <RotateCcw className="size-5" /> {t("again")}
        </Btn>
      )}
    </div>
  );
}

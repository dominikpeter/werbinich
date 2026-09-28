"use client";
import { useEffect, useState } from "react";
import { markPlayed } from "@/lib/client";
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
  useEffect(markPlayed, []); // a finished game: from now on the home page may offer the app

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
                {/* face down: the whole card picks the path; the writer's reveal button sits on top of it */}
                <div className="face relative">
                  <button onClick={() => setPick(p.id)} className={`glass flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl p-3 ${pick === p.id ? "glow-jev" : ""} ${mine && !open ? "pb-14" : ""}`}>
                    <Lock className="size-6 text-muted" aria-hidden />
                    <span className="text-lg font-bold">{p.name}</span>
                    <span className="text-sm text-muted">{t("locked")}</span>
                  </button>
                  {mine && !open && (
                    <button onClick={() => act({ type: "unlock", target: p.id })} className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-gold-ink">
                      {t("unlock")}
                    </button>
                  )}
                </div>
                {/* face up */}
                <button onClick={() => setPick(p.id)} className={`face back flex h-40 flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center ${p.status === "solved" ? "bg-gold text-gold-ink" : "glass"} ${pick === p.id ? "glow-jev" : ""}`}>
                  <span className="text-xs font-semibold opacity-70">{p.name}</span>
                  <span className="font-display text-xl leading-tight font-bold" data-testid="card-person">{p.person}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm font-medium opacity-80">
                    {p.status === "solved" ? <><Star className="size-3.5" fill="currentColor" /> {t("place", { n: p.place })},</> : `${t("gaveUp")},`}
                    {p.questions.length === 1 ? t("question1") : t("questions", { n: p.questions.length })}
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
            <p className="mt-2 px-1 text-sm text-jev">
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

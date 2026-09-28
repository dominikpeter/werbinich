"use client";
import { Check, Flag, Mic, Sparkles, Star, X } from "lucide-react";
import type { Question } from "@/lib/game";
import { heat, useLang } from "./ui";

/**
 * The path to the answer: a spine of nodes, one per question. Each node shows the table's answer (a check in mint, a
 * cross in coral); the spine below it takes that colour, so the whole way reads at a glance. Jev's warmth after each
 * answer is the small heat bar under the question. It ends in a gold star when solved, a flag when given up.
 */
export function Tree({ questions, end, person }: { questions: Question[]; end: "solved" | "gaveup" | "playing"; person?: string }) {
  const { t } = useLang();
  return (
    <ol className="relative flex flex-col pt-1 pl-1" data-testid="tree">
      {questions.map((q, i) => {
        const last = i === questions.length - 1 && end === "playing";
        const line = q.answer === "yes" ? "bg-yes" : q.answer === "no" ? "bg-no" : "bg-line";
        return (
          <li key={q.id} className="rise relative flex gap-3 pb-4">
            {!last && <span className={`absolute top-9 bottom-0 left-4 w-0.5 -translate-x-1/2 rounded-full opacity-60 ${line}`} aria-hidden />}
            <span
              className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ${q.answer === "yes" ? "bg-yes text-yes-ink" : q.answer === "no" ? "bg-no text-no-ink" : "bg-raised text-luna ring-2 ring-luna"}`}
              aria-label={q.answer ? t(q.answer) : "…"}
            >
              {q.answer === "yes" ? <Check className="size-4" strokeWidth={3} /> : q.answer === "no" ? <X className="size-4" strokeWidth={3} /> : <span className="size-2 animate-ping rounded-full bg-luna" />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-lg leading-snug">
                {q.text}
                {q.voice && <Mic className="ml-1.5 inline size-3.5 text-muted" aria-label={t("voice")} />}
                {q.joker && <Sparkles className="ml-1.5 inline size-3.5 text-jev" aria-label={t("joker")} />}
              </p>
              {q.warmth !== undefined && (
                <span className="mt-1.5 flex items-center gap-2" aria-label={`${t("warmth")} ${Math.round(q.warmth * 100)}%`}>
                  <span className="h-1 w-16 overflow-hidden rounded-full bg-raised">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(6, q.warmth * 100)}%`, background: heat(q.warmth) }} />
                  </span>
                  <span className="font-mono text-2xs text-muted">{Math.round(q.warmth * 100)}%</span>
                </span>
              )}
            </div>
          </li>
        );
      })}
      {end !== "playing" && (
        <li className="pop flex items-center gap-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${end === "solved" ? "bg-gold text-gold-ink glow-gold" : "bg-raised text-muted"}`}>
            {end === "solved" ? <Star className="size-4" fill="currentColor" /> : <Flag className="size-4" />}
          </span>
          <span className={`text-xl font-bold ${end === "solved" ? "text-gold" : "text-muted"}`}>{person || (end === "gaveup" ? t("gaveUp") : "")}</span>
        </li>
      )}
    </ol>
  );
}

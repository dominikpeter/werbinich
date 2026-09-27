"use client";
import { Flag, Mic, Sparkles, Star } from "lucide-react";
import type { Question } from "@/lib/game";
import { heat, useLang } from "./ui";

const ROW = 68; // px per question
const X = 30; // the spine
const OUT = 16; // how far a branch swings out

/**
 * The decision path: one node per question, coloured by Jev's warmth after it. From every answered node the taken branch
 * (yes swings left in mint, no right in coral) curves on to the next question; the branch not taken is a faded stub.
 * The path ends in a gold star when solved, a flag when given up, a pulsing ring while a question is open.
 */
export function Tree({ questions, end, person }: { questions: Question[]; end: "solved" | "gaveup" | "playing"; person?: string }) {
  const { t } = useLang();
  const rows = questions.length + (end === "playing" ? 0 : 1);
  const h = Math.max(1, rows) * ROW;
  return (
    <div className="relative" data-testid="tree">
      <svg width={X * 2} height={h} className="absolute top-0 left-0" aria-hidden>
        {questions.map((q, i) => {
          const y = i * ROW + 22;
          const last = i === questions.length - 1;
          if (!q.answer) return null;
          const dir = q.answer === "yes" ? -1 : 1;
          const color = q.answer === "yes" ? "var(--color-yes)" : "var(--color-no)";
          const ny = y + ROW;
          const goesOn = !last || end !== "playing";
          return (
            <g key={q.id}>
              {/* the branch not taken */}
              <path d={`M${X} ${y} q ${-dir * OUT} 14 ${-dir * OUT * 1.4} 30`} stroke="var(--color-line)" strokeWidth="2" strokeDasharray="3 4" fill="none" />
              <circle cx={X - dir * OUT * 1.4} cy={y + 30} r="2.5" fill="var(--color-line)" />
              {/* the branch taken */}
              {goesOn && <path d={`M${X} ${y} C ${X + dir * OUT * 1.6} ${y + ROW * 0.35}, ${X + dir * OUT * 1.6} ${ny - ROW * 0.35}, ${X} ${ny}`} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" className="rise" />}
            </g>
          );
        })}
        {questions.map((q, i) => {
          const y = i * ROW + 22;
          return (
            <g key={`n${q.id}`}>
              {!q.answer && <circle cx={X} cy={y} r="14" fill="none" stroke="var(--color-luna)" strokeWidth="2" className="animate-ping" style={{ transformOrigin: `${X}px ${y}px` }} />}
              <circle cx={X} cy={y} r="11" fill={q.warmth === undefined ? "var(--color-raised)" : heat(q.warmth)} stroke="var(--color-canvas)" strokeWidth="3" />
              <text x={X} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-canvas)" className="font-mono">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <ol className="relative">
        {questions.map((q) => (
          <li key={q.id} className="rise flex items-start gap-2 pl-16" style={{ height: ROW }}>
            <div className="min-w-0 flex-1 pt-3">
              <p className="line-clamp-2 text-sm leading-snug">
                {q.voice && <Mic className="mr-1 inline size-3 text-luna" aria-label="voice" />}
                {q.joker && <Sparkles className="mr-1 inline size-3 text-jev" aria-label="joker" />}
                {q.text}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 pt-3">
              {q.answer ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.answer === "yes" ? "bg-yes text-yes-ink" : "bg-no text-no-ink"}`}>{t(q.answer)}</span>
              ) : (
                <span className="font-mono text-xs text-luna">…</span>
              )}
              {q.warmth !== undefined && <span className="font-mono text-2xs text-muted">{Math.round(q.warmth * 100)}%</span>}
            </div>
          </li>
        ))}
        {end !== "playing" && (
          <li className="pop flex items-center gap-3 pl-3" style={{ height: ROW }}>
            <span className={`grid size-9 place-items-center rounded-full ${end === "solved" ? "bg-gold text-gold-ink glow-gold" : "bg-raised text-muted"}`}>
              {end === "solved" ? <Star className="size-5" fill="currentColor" /> : <Flag className="size-4" />}
            </span>
            <span className={`font-display text-lg font-bold ${end === "solved" ? "text-gold" : "text-muted"}`}>{person || (end === "gaveup" ? t("gaveUp") : "")}</span>
          </li>
        )}
      </ol>
    </div>
  );
}

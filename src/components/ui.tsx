"use client";
import { useSyncExternalStore } from "react";
import { getLang, LANG_KEY } from "@/lib/client";
import { tr, type Lang } from "@/lib/i18n";

// the language lives in localStorage; every component reads it through this hook and re-renders when it changes
const subs = new Set<() => void>();
export function setLang(l: Lang) {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {}
  document.documentElement.lang = l;
  subs.forEach((f) => f());
}
export function useLang() {
  const lang = useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), getLang, () => "de" as Lang);
  return { lang, t: tr(lang) };
}

// voice on/off, per phone: off means the mic never opens and questions are typed
const VOICE_KEY = "werbinich:voice";
const getVoice = () => {
  try {
    return localStorage.getItem(VOICE_KEY) !== "off";
  } catch {
    return true;
  }
};
export function setVoice(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? "on" : "off");
  } catch {}
  subs.forEach((f) => f());
}
export const useVoice = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), getVoice, () => true);

type Tone = "ink" | "yes" | "no" | "gold" | "jev" | "ghost";
const TONES: Record<Tone, string> = {
  ink: "bg-ink text-canvas",
  yes: "bg-yes text-yes-ink",
  no: "bg-no text-no-ink",
  gold: "bg-gold text-gold-ink",
  jev: "bg-jev text-canvas",
  ghost: "glass text-ink",
};
export function Btn({ tone = "ink", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${TONES[tone]} ${className}`}
    />
  );
}

/** the Jev warmth meter: cold blue to hot orange, with the number in mono */
export function Warmth({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="w-full" aria-label={`${label} ${pct}%`}>
      <div className="mb-1 flex justify-between font-mono text-xs text-muted">
        <span>{label}</span>
        <span className="text-ink">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(3, pct)}%`, background: `linear-gradient(90deg, var(--color-cold), color-mix(in oklch, var(--color-cold), var(--color-hot) ${pct}%))` }}
        />
      </div>
    </div>
  );
}

export const heat = (w: number) => `color-mix(in oklch, var(--color-cold), var(--color-hot) ${Math.round(w * 100)}%)`;

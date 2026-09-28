"use client";
import { Download, Share, SquarePlus, type LucideIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { PLAYED_KEY } from "@/lib/client";
import { useLang } from "./ui";

// "as an app": on a phone that hasn't installed it yet, after its first game. Android/Chrome hand us an install prompt to
// call; iPhones have none, so they get the two taps to do it by hand. It asks once per phone: any choice ends it.
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "werbinich:install-done";
let deferred: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const remember = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
};

// registered as soon as this module loads: Chrome may fire the event before React is up
if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // no mini-infobar: our card asks instead
    deferred = e as InstallPrompt;
    notify();
  });
  addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    remember();
    notify();
  });
}

type Kind = "prompt" | "ios" | null;
function kind(): Kind {
  if (installed) return null;
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone || !matchMedia("(pointer: coarse)").matches) return null; // installed already, or not a phone
  try {
    if (localStorage.getItem(KEY)) return null; // asked once already
    if (!localStorage.getItem(PLAYED_KEY)) return null; // a first visit is for playing; after a game is the moment to offer it
  } catch {}
  if (deferred) return "prompt";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS says Mac
  return ios ? "ios" : null;
}
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

function Step({ icon: I, children }: { icon: LucideIcon; children: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-raised px-3 py-2.5 text-sm font-medium">
      <I className="size-5 shrink-0 text-luna" aria-hidden />
      {children}
    </li>
  );
}

export function InstallHint() {
  const { t } = useLang();
  const k = useSyncExternalStore(subscribe, kind, () => null);
  const [gone, setGone] = useState(false);
  if (!k || gone) return null;
  const dismiss = () => {
    remember();
    setGone(true);
  };
  const install = async () => {
    const p = deferred;
    if (!p) return;
    await p.prompt();
    await p.userChoice; // installed or declined in the system dialog: either way a choice, so it's done
    deferred = null;
    dismiss();
  };
  return (
    <aside aria-label={t("installTitle")} className="rise glass rounded-3xl p-4" data-testid="install-hint">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
        <p className="min-w-0 leading-tight font-bold text-balance">{t("installTitle")}</p>
      </div>
      <p className="mt-2 text-sm leading-snug text-muted">{t("installNote")}</p>
      {k === "ios" && (
        <ol className="mt-3 grid gap-1.5">
          <Step icon={Share}>{t("installIosShare")}</Step>
          <Step icon={SquarePlus}>{t("installIosAdd")}</Step>
        </ol>
      )}
      <div className="mt-3 flex items-center gap-2">
        {k === "prompt" && (
          <button type="button" onClick={install} className="flex min-h-11 items-center gap-2 rounded-full bg-gold px-4 font-bold text-gold-ink transition active:scale-95">
            <Download className="size-4" aria-hidden /> {t("installButton")}
          </button>
        )}
        <button type="button" onClick={dismiss} className="min-h-11 rounded-full px-4 font-semibold text-muted">
          {t("installLater")}
        </button>
      </div>
    </aside>
  );
}

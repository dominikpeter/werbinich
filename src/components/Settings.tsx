"use client";
import { useRef } from "react";
import Link from "next/link";
import { BookOpen, LogOut, Mic, MicOff, Settings as Gear, X } from "lucide-react";
import { LANGS } from "@/lib/i18n";
import { setLang, setVoice, useLang, useVoice } from "./ui";
import { Sheet } from "./Sheet";

const LANG_LABEL = { de: "Deutsch", en: "English", fr: "Français" } as const;

/** the only control on top: a gear that opens the settings sheet (a native modal dialog) */
export function SettingsButton({ room }: { room?: string }) {
  const { lang, t } = useLang();
  const voice = useVoice();
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button onClick={() => ref.current?.showModal()} aria-label={t("settings")} className="grid size-11 place-items-center rounded-full glass text-muted transition active:scale-90">
        <Gear className="size-5" />
      </button>
      <Sheet ref={ref}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("settings")}</h2>
            <button onClick={() => ref.current?.close()} aria-label={t("close")} className="grid size-10 place-items-center rounded-full text-muted"><X className="size-5" aria-hidden /></button>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{t("language")}</h3>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1">
              {LANGS.map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={l === lang} className={`min-h-12 rounded-xl font-semibold transition ${l === lang ? "bg-ink text-canvas" : "text-muted"}`}>
                  {LANG_LABEL[l]}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{t("voice")}</h3>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1">
              {[true, false].map((on) => (
                <button key={String(on)} onClick={() => setVoice(on)} aria-pressed={voice === on} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl font-semibold transition ${voice === on ? "bg-ink text-canvas" : "text-muted"}`}>
                  {on ? <Mic className="size-4" /> : <MicOff className="size-4" />} {on ? t("voiceOn") : t("voiceOff")}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted">{t("privacy")}</p>
          </section>

          <section className="flex flex-col gap-1 rounded-2xl bg-canvas p-4 font-mono text-xs text-muted">
            <p><span className="text-luna">STT</span> gpt-transcribe — {t("aboutStt")}</p>
            <p><span className="text-luna">Luna</span> gpt-6-luna — {t("aboutLuna")}</p>
            <p><span className="text-jev">Jev</span> typesafe/jev — {t("aboutJev")}</p>
          </section>

          <div className="flex flex-col gap-2">
            <Link href="https://github.com/dominikpeter/werbinich/blob/main/docs/MANUAL.md" className="flex min-h-12 items-center gap-3 rounded-2xl px-2 font-semibold"><BookOpen className="size-5 text-jev" /> {t("rules")}</Link>
            {room && <Link href="/" className="flex min-h-12 items-center gap-3 rounded-2xl px-2 font-semibold text-no"><LogOut className="size-5" /> {t("leave")} · {room}</Link>}
          </div>
          <p className="text-center font-mono text-2xs text-muted">werbinich.ai v{process.env.NEXT_PUBLIC_VERSION}</p>
      </Sheet>
    </>
  );
}

"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Play, X } from "lucide-react";
import type { RoomView, Act } from "@/app/r/[code]/page";
import { useLang } from "./ui";
import { Sheet } from "./Sheet";

/** back arrow: straight home in the lobby and at the end; mid-game it asks, and the host may call the game off */
export function BackButton({ view, act }: { view: RoomView; act: Act }) {
  const { t } = useLang();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const safe = view.phase === "lobby" || view.phase === "end";
  const host = view.me === view.host;
  const row = "flex min-h-16 w-full flex-col items-start justify-center rounded-2xl px-4 py-2 text-left transition active:scale-95";
  return (
    <>
      <button onClick={() => (safe ? router.push("/") : ref.current?.showModal())} aria-label={t("back")} className="grid size-11 place-items-center rounded-full glass text-muted transition active:scale-90">
        <ArrowLeft className="size-5" />
      </button>
      <Sheet ref={ref} label={t("leaveConfirm")}>
        <h2 className="mb-2 text-2xl font-bold">{t("leaveConfirm")}</h2>
        <button onClick={() => ref.current?.close()} className={`${row} bg-ink text-canvas`}>
          <span className="flex items-center gap-2 font-semibold"><Play className="size-4" /> {t("resume")}</span>
        </button>
        <button onClick={() => router.push("/")} className={`${row} bg-raised`}>
          <span className="flex items-center gap-2 font-semibold"><Home className="size-4" /> {t("home")}</span>
          <span className="text-sm text-muted">{t("leaveNote")}</span>
        </button>
        {host && (
          <button onClick={() => (ref.current?.close(), act({ type: "cancel" }))} className={`${row} bg-no/15 text-no`}>
            <span className="flex items-center gap-2 font-semibold"><X className="size-4" /> {t("cancelGame")}</span>
            <span className="text-sm opacity-80">{t("cancelNote")}</span>
          </button>
        )}
      </Sheet>
    </>
  );
}

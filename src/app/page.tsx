"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Smartphone, Users, ArrowRight, Sparkles } from "lucide-react";
import { api, ApiError, NAME_KEY, saveIdentity } from "@/lib/client";
import { Btn, LangSwitch, useLang } from "@/components/ui";
import type { Key } from "@/lib/i18n";

// floating "forehead" notes on the hero: who might you be?
const NOTES = [
  { name: "Heidi", cls: "left-[6%] top-8 -rotate-6" },
  { name: "Einstein", cls: "right-[8%] top-2 rotate-6" },
  { name: "Federer", cls: "left-[18%] top-36 rotate-3" },
  { name: "Pippi", cls: "right-[14%] top-32 -rotate-3" },
];

export default function Home() {
  const { lang, t } = useLang();
  const router = useRouter();
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : (localStorage.getItem(NAME_KEY) ?? "")));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async (fn: () => Promise<{ code: string; pid: string; token: string }>) => {
    if (!name.trim()) return setErr(t("yourName"));
    setBusy(true);
    setErr("");
    try {
      localStorage.setItem(NAME_KEY, name.trim());
      const r = await fn();
      saveIdentity(r.code, { pid: r.pid, token: r.token });
      router.push(`/r/${r.code}`);
    } catch (e) {
      setErr(t((e instanceof ApiError ? e.message : "offline") as Key));
      setBusy(false);
    }
  };
  const create = (local: boolean) => go(() => api("", { name, lang, local }));
  const join = () => go(async () => ({ code: code.toUpperCase(), ...(await api<{ pid: string; token: string }>(`/${code.toUpperCase()}`, { type: "join", name })) }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8">
      <div className="flex items-center justify-between py-4">
        <span className="font-mono text-sm text-muted">werbinich<span className="text-jev">.ai</span></span>
        <LangSwitch />
      </div>

      <section className="relative h-56 short:h-40">
        {NOTES.map((n, i) => (
          <div key={n.name} className={`float absolute rounded-lg bg-gold px-3 py-1.5 font-display text-sm font-bold text-gold-ink shadow-lg ${n.cls}`} style={{ animationDelay: `${i * 0.7}s` }}>
            {n.name}?
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 text-center">
          <h1 className="font-display text-6xl leading-none font-extrabold tracking-tight short:text-5xl">
            Wer bin <span className="bg-gradient-to-r from-jev to-luna bg-clip-text text-transparent">ich?</span>
          </h1>
        </div>
      </section>

      <p className="mt-4 text-center text-lg font-semibold">{t("tagline")}</p>
      <p className="mt-2 text-center text-sm text-muted">{t("sub")}</p>

      <div className="mt-6 flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("yourName")}
          maxLength={24}
          aria-label={t("yourName")}
          className="glass rounded-2xl px-4 py-3.5 text-lg outline-none focus:border-jev"
        />
        <div className="grid grid-cols-2 gap-3">
          <button disabled={busy} onClick={() => create(false)} className="glass glow-jev flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition active:scale-95">
            <Users className="size-6 text-jev" />
            <span className="font-semibold">{t("newRoom")}</span>
            <span className="text-xs text-muted">{t("newRoomHint")}</span>
          </button>
          <button disabled={busy} onClick={() => create(true)} className="glass flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition active:scale-95">
            <Smartphone className="size-6 text-luna" />
            <span className="font-semibold">{t("onePhone")}</span>
            <span className="text-xs text-muted">{t("onePhoneHint")}</span>
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5))}
            placeholder={t("code")}
            aria-label={t("code")}
            className="glass w-0 flex-1 rounded-2xl px-4 py-3.5 font-mono text-lg tracking-code uppercase outline-none"
          />
          <Btn tone="ghost" disabled={busy || code.length !== 5} onClick={join}>
            {t("join")} <ArrowRight className="size-4" />
          </Btn>
        </div>
        {err && <p className="text-center text-sm text-no" role="alert">{err}</p>}
      </div>

      <div className="mt-auto flex items-center justify-center gap-2 pt-8 font-mono text-xs text-muted">
        <Sparkles className="size-3.5 text-jev" /> Jev · Luna · STT
      </div>
    </main>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Smartphone, Users, ArrowRight, Sparkles } from "lucide-react";
import { api, ApiError, NAME_KEY, saveIdentity } from "@/lib/client";
import { Btn, LangSwitch, useLang } from "@/components/ui";
import type { Key } from "@/lib/i18n";

// "forehead" notes over the title: who might you be?
const NOTES = [
  { name: "Heidi", r: "-rotate-6" },
  { name: "Einstein", r: "rotate-3" },
  { name: "Federer", r: "-rotate-2" },
  { name: "Pippi", r: "rotate-6" },
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

      <section className="mt-8 flex flex-col items-center gap-6 short:mt-2">
        <div className="flex flex-wrap justify-center gap-2.5">
          {NOTES.map((n, i) => (
            <span key={n.name} className={`float rounded-lg bg-gold px-3 py-1 text-sm font-semibold text-gold-ink shadow-lg ${n.r}`} style={{ animationDelay: `${i * 0.6}s` }}>
              {n.name}?
            </span>
          ))}
        </div>
        <h1 className="text-center text-6xl leading-none font-bold tracking-tighter short:text-5xl">
          Wer bin <span className="bg-gradient-to-r from-jev to-luna bg-clip-text text-transparent">ich?</span>
        </h1>
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

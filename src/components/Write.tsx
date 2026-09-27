"use client";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { PhaseProps } from "@/app/r/[code]/page";
import { Btn, useLang } from "./ui";

/** everyone writes a person for the player they were given; one phone: passed from writer to writer */
export function Write({ view, act }: PhaseProps) {
  const { t } = useLang();
  const left = view.players.filter((p) => !p.writtenBy).length; // targets still without a person
  const [handedTo, setHandedTo] = useState("");

  if (view.local) {
    const writer = view.players.find((p) => !view.players.find((x) => x.id === p.writesFor)?.writtenBy);
    if (!writer) return null;
    if (handedTo !== writer.id)
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-muted">{t("passTo")}</p>
          <p className="pop font-display text-5xl font-extrabold">{writer.name}</p>
          <Btn tone="gold" className="w-full py-4 text-lg" onClick={() => setHandedTo(writer.id)}>{t("iAm", { name: writer.name })}</Btn>
        </div>
      );
    return <Form key={writer.id} target={writer.writesForName} onDone={(person) => act({ type: "write", person, as: writer.id })} act={act} />;
  }

  const me = view.players.find((p) => p.id === view.me)!;
  const done = view.players.find((p) => p.id === me.writesFor)?.writtenBy === me.id;
  if (done)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Check className="pop size-14 text-yes" />
        <p className="animate-pulse text-muted">{t("waitingWrite", { n: left })}</p>
      </div>
    );
  return <Form target={me.writesForName} onDone={(person) => act({ type: "write", person })} act={act} />;
}

function Form({ target, onDone, act }: { target: string; onDone: (p: string) => Promise<unknown>; act: PhaseProps["act"] }) {
  const { t } = useLang();
  const [person, setPerson] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const suggest = async () => {
    setBusy(true);
    try {
      const r = (await act({ type: "suggest" })) as { names: string[] };
      setIdeas(r.names ?? []);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="flex flex-1 flex-col gap-4" onSubmit={(e) => (e.preventDefault(), person.trim() && onDone(person))}>
      <h1 className="rise mt-6 font-display text-4xl leading-tight font-extrabold">{t("writeFor", { name: target })}</h1>
      <p className="text-sm text-muted">{t("writeHint", { name: target })}</p>
      <input autoFocus value={person} onChange={(e) => setPerson(e.target.value)} placeholder={t("personPh")} aria-label={t("personPh")} maxLength={60} className="glass rounded-2xl px-4 py-4 text-xl outline-none focus:border-gold" />
      <button type="button" onClick={suggest} disabled={busy} className="flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm text-luna transition active:scale-95 disabled:opacity-50">
        <Sparkles className={`size-4 ${busy ? "animate-spin" : ""}`} /> {t("suggest")}
      </button>
      {ideas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ideas.map((n, i) => (
            <button type="button" key={n} onClick={() => setPerson(n)} className="pop glass rounded-full px-3 py-1.5 text-sm" style={{ animationDelay: `${i * 60}ms` }}>
              {n}
            </button>
          ))}
        </div>
      )}
      <Btn type="submit" tone="gold" className="mt-auto py-4 text-lg" disabled={!person.trim()}>{t("done")}</Btn>
    </form>
  );
}

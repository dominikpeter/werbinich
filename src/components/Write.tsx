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
          <p className="pop font-display text-5xl font-bold">{writer.name}</p>
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
    <form className="flex flex-1 flex-col gap-5" onSubmit={(e) => (e.preventDefault(), person.trim() && onDone(person))}>
      <div className="rise mt-4">
        <h1 className="text-4xl leading-tight font-bold text-balance">{t("writeFor", { name: target })}</h1>
        <p className="mt-2 text-muted">{t("writeHint", { name: target })}</p>
      </div>
      {/* you write on the note that goes on their forehead */}
      <label className="note relative mt-2 block -rotate-1 rounded-md px-5 pt-6 pb-5">
        <span className="tape" aria-hidden />
        <input
          value={person}
          name="person"
          autoComplete="off"
          onChange={(e) => setPerson(e.target.value)}
          placeholder={t("personPh")}
          aria-label={t("personPh")}
          maxLength={60}
          enterKeyHint="done"
          className="w-full bg-transparent text-3xl font-bold text-gold-ink outline-none placeholder:text-gold-ink/35"
        />
      </label>
      <button type="button" onClick={suggest} disabled={busy} className="glass flex min-h-14 items-center justify-center gap-2.5 rounded-2xl text-lg font-semibold text-luna transition active:scale-95 disabled:opacity-60">
        <Sparkles className={`size-5 ${busy ? "animate-spin" : ""}`} /> {busy ? t("thinking") : t("suggest")}
      </button>
      {ideas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ideas.map((n, i) => (
            <button type="button" key={n} onClick={() => setPerson(n)} className={`pop min-h-12 rounded-full px-4 font-medium transition active:scale-95 ${n === person ? "bg-gold text-gold-ink" : "glass"}`} style={{ animationDelay: `${i * 60}ms` }}>
              {n}
            </button>
          ))}
        </div>
      )}
      <Btn type="submit" tone="gold" className="mt-auto min-h-16 text-xl" disabled={!person.trim()}>{t("done")}</Btn>
    </form>
  );
}

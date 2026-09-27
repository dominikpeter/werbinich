"use client";
import { useEffect, useRef, useState } from "react";
import { Ear, Flag, Keyboard, Mic, SkipForward, Sparkles, Star, X } from "lucide-react";
import type { PhaseProps } from "@/app/r/[code]/page";
import type { Joker, ViewPlayer } from "@/lib/game";
import { useListener, type Clip } from "@/lib/listen";
import { Tree } from "./Tree";
import { Btn, useLang, useVoice, Warmth } from "./ui";

type Heard = { text: string; did: string };

export function Play({ view, act, code, id, refresh }: PhaseProps) {
  const { lang, t } = useLang();
  const guesser = view.players.find((p) => p.id === view.turn)!;
  const open = guesser.questions.find((q) => !q.answer);
  const iAsk = view.local || view.me === view.turn; // this phone runs the guesser's side
  const iAnswer = view.local || view.me !== view.turn; // and/or the table's side
  const as = view.local ? { as: guesser.id } : {};
  const warmth = [...guesser.questions].reverse().find((q) => q.warmth !== undefined)?.warmth ?? 0;

  // ---- the ear: only the guesser's phone (or the one shared phone) listens ----
  const [handsFree, setHandsFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<Heard | null>(null);
  const onClip = async (c: Clip) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/rooms/${code}/hear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...id, audio: c.b64, format: "wav", lang }) }).then((x) => x.json());
      if (r.heard) setHeard({ text: r.text ?? r.heard, did: r.did });
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  // the mic opens on first use (hands-free or a press) and stays open; only detected speech ever leaves the phone
  const [micOn, setMicOn] = useState(false);
  const voice = useVoice() && view.ai; // voice switched off in the settings: the mic never opens, questions are typed
  const ear = useListener(voice && iAsk && micOn, handsFree, onClip);

  // ---- typed fallback, joker, give-up ----
  const [typing, setTyping] = useState(!view.ai);
  const [text, setText] = useState("");
  const [joker, setJoker] = useState<Joker | null>(null);
  const [jokerBusy, setJokerBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const ask = async (q: string, extra: object = {}) => {
    if (!q.trim()) return;
    await act({ type: "ask", text: q, ...as, ...extra });
    setText("");
  };
  const useJoker = async () => {
    setJokerBusy(true);
    try {
      setJoker((await act({ type: "joker", ...as })) as Joker);
    } finally {
      setJokerBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">

      <section className="rise flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">{view.me === view.turn && !view.local ? t("yourTurn") : t("turnOf", { name: guesser.name })}</p>
          <h1 className="text-4xl font-bold tracking-tight" data-testid="guesser">{guesser.name}</h1>
        </div>
        {iAnswer && guesser.person && <PersonCard person={guesser.person} hideFrom={view.local ? guesser.name : ""} jev={view.local && open?.truth !== undefined ? `${t("jevSays")}: ${open.truth >= 0.5 ? t("yes") : t("no")} ${Math.round(Math.max(open.truth, 1 - open.truth) * 100)}%` : ""} />}
      </section>

      <Warmth value={warmth} label={t("warmth")} />

      <section className="glass flex-1 overflow-y-auto rounded-3xl p-3">
        <Tree questions={guesser.questions} end="playing" />
        {!guesser.questions.length && <p className="p-6 text-center text-sm text-muted">{t("askPh")}</p>}
      </section>

      {/* the table's side: the open question, Jev's quiet opinion, the answer */}
      {iAnswer && open && (
        <section className="pop glass glow-jev rounded-3xl p-4" data-testid="answer-panel">
          <p className="text-2xl leading-tight font-bold">{open.text}</p>
          {open.truth !== undefined && !view.local && (
            <p className="mt-1 font-mono text-xs text-jev">
              {t("jevSays")}: {open.truth >= 0.5 ? t("yes") : t("no")} · {Math.round(Math.max(open.truth, 1 - open.truth) * 100)}%
              {(open.guess ?? 0) > 0.5 && <> · <Star className="inline size-3" /> {t("solved")}?</>}
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 [&>button]:min-h-16 [&>button]:text-lg">
            <Btn tone="yes" onClick={() => act({ type: "answer", qid: open.id, answer: "yes" })}>{t("yes")}</Btn>
            <Btn tone="no" onClick={() => act({ type: "answer", qid: open.id, answer: "no" })}>{t("no")}</Btn>
            <Btn tone="gold" onClick={() => act({ type: "answer", qid: open.id, answer: "yes", solved: true })}>{t("solved")}</Btn>
          </div>
        </section>
      )}
      {!iAnswer && open && <p className="animate-pulse text-center text-sm text-muted">{t("waitAnswer")}</p>}

      {/* the guesser's side: speak, type, joker, give up */}
      {iAsk && (
        <section className="flex flex-col gap-3">
          {heard && (
            <p className="rise text-center font-mono text-xs text-muted" data-testid="heard">
              <Ear className="mr-1 inline size-3" /> {t("heard")}: “{heard.text}” {heard.did === "chatter" && <span className="text-no">· {t("chatter")}</span>}
            </p>
          )}
          {ear.error && <p className="text-center text-xs text-no">{t("micDenied")}</p>}
          {typing || !voice || ear.error ? (
            <form onSubmit={(e) => (e.preventDefault(), ask(text))} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} disabled={!!open} placeholder={t("askPh")} aria-label={t("ask")} maxLength={200} className="glass w-0 flex-1 rounded-2xl px-4 py-3 outline-none disabled:opacity-40" />
              <Btn type="submit" disabled={!!open || !text.trim()}>{t("send")}</Btn>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <MicButton ear={ear} busy={busy} handsFree={handsFree} label={handsFree ? (ear.speaking ? t("listening") : t("handsFree")) : t("holdToTalk")} onFirst={() => setMicOn(true)} />
              <button onClick={() => (setMicOn(true), setHandsFree((h) => !h))} aria-pressed={handsFree} className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs transition ${handsFree ? "text-luna" : "text-muted"}`}>
                <Ear className="size-5" /> {t("handsFree")}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {voice && (
              <button onClick={() => setTyping((x) => !x)} className="rounded-xl p-2 text-muted" aria-label="keyboard">
                {typing ? <Mic className="size-5" /> : <Keyboard className="size-5" />}
              </button>
            )}
            <Btn tone="jev" className="flex-1" disabled={!view.ai || guesser.jokers < 1 || jokerBusy || !!open} onClick={useJoker}>
              <Sparkles className={`size-4 ${jokerBusy ? "animate-spin" : ""}`} /> {t("joker")} · {t("jokerLeft", { n: guesser.jokers })}
            </Btn>
            {sure ? (
              <Btn tone="no" onClick={() => (setSure(false), act({ type: "giveup", ...as }))}>{t("giveUpSure")}</Btn>
            ) : (
              <Btn tone="ghost" onClick={() => setSure(true)} aria-label={t("giveUp")}><Flag className="size-4" /></Btn>
            )}
          </div>
        </section>
      )}

      {view.me === view.host && !iAsk && (
        <button onClick={() => act({ type: "skip" })} className="flex items-center justify-center gap-1 text-xs text-muted"><SkipForward className="size-3" /> {t("skip")}</button>
      )}

      {joker && <JokerSheet joker={joker} onClose={() => setJoker(null)} onAsk={(q) => (setJoker(null), ask(q, { joker: true }))} />}
    </div>
  );
}

function MicButton({ ear, busy, handsFree, label, onFirst }: { ear: ReturnType<typeof useListener>; busy: boolean; handsFree: boolean; label: string; onFirst: () => void }) {
  const { t } = useLang();
  const [down, setDown] = useState(false);
  const start = () => {
    if (handsFree) return;
    setDown(true);
    onFirst(); // a press before the stream is live still records: the recorder starts as soon as audio flows
    ear.hold();
  };
  const end = () => {
    if (!down) return;
    setDown(false);
    ear.release();
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={label}
        className={`mic-ring grid size-24 touch-none place-items-center rounded-full transition select-none disabled:opacity-40 ${down || (handsFree && ear.speaking) ? "scale-110 bg-luna text-canvas" : handsFree ? "bg-raised text-luna" : "bg-ink text-canvas"}`}
        style={{ "--level": handsFree || down ? ear.level : 0 } as React.CSSProperties}
      >
        {busy ? <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Mic className="size-10" />}
      </button>
      <span className="font-mono text-xs text-muted">{busy ? t("thinking") : label}</span>
    </div>
  );
}

/** the secret on the table's phones; on the shared phone it stays covered until held, so the guesser can't glance */
function PersonCard({ person, hideFrom, jev }: { person: string; hideFrom: string; jev: string }) {
  const { t } = useLang();
  const [peek, setPeek] = useState(false);
  if (!hideFrom)
    return <div className="pop max-w-card -rotate-2 rounded-xl bg-gold px-4 py-2 text-right font-display text-lg leading-tight font-bold text-gold-ink shadow-lg" data-testid="person">{person}</div>;
  return (
    <button onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)} onPointerLeave={() => setPeek(false)} onContextMenu={(e) => e.preventDefault()} className="max-w-card touch-none rounded-xl bg-gold px-3 py-2 text-right leading-tight text-gold-ink select-none">
      {peek ? (
        <>
          <span className="block font-display text-lg font-bold" data-testid="person">{person}</span>
          {jev && <span className="block font-mono text-2xs">{jev}</span>}
        </>
      ) : (
        <span className="text-xs font-semibold">{t("peek")}<br /><span className="opacity-70">{t("notFor", { name: hideFrom })}</span></span>
      )}
    </button>
  );
}

function JokerSheet({ joker, onClose, onAsk }: { joker: Joker; onClose: () => void; onAsk: (q: string) => void }) {
  const { t } = useLang();
  const max = Math.max(...joker.questions.map((q) => q.p), 0.01);
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-canvas/70 backdrop-blur-sm" onClick={onClose}>
      <div className="rise glass mx-auto w-full max-w-md rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()} data-testid="joker">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl font-bold"><span className="text-luna">Luna</span> × <span className="text-jev">Jev</span></h2>
          <button onClick={onClose} aria-label="close" className="p-1 text-muted"><X className="size-5" /></button>
        </div>
        <p className="mt-1 text-xs text-muted">{t("jokerHint")}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {joker.questions.map((q, i) => (
            <li key={i}>
              <button onClick={() => onAsk(q.text)} className={`pop relative w-full overflow-hidden rounded-2xl p-3 text-left ${i === joker.best ? "glow-jev bg-raised" : "bg-surface"}`} style={{ animationDelay: `${i * 80}ms` }}>
                <span className="absolute inset-y-0 left-0 bg-jev/15 transition-all duration-700" style={{ width: `${(q.p / max) * 100}%` }} />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="text-sm">{i === joker.best && <Sparkles className="mr-1 inline size-3.5 text-jev" />}{q.text}</span>
                  <span className="font-mono text-xs text-jev">{Math.round(q.p * 100)}%</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center font-mono text-2xs text-muted">{t("hotTip")}: {t("useIt")} ↑</p>
      </div>
    </div>
  );
}

/** a gold pop when someone solves it, and the "would the AI have known?" reveal when someone gives up */
export function Celebrations({ view }: { view: PhaseProps["view"] }) {
  const { t } = useLang();
  const seen = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<ViewPlayer | null>(null);
  useEffect(() => {
    const done = view.players.filter((p) => p.status !== "playing");
    if (!seen.current) {
      seen.current = new Set(done.map((p) => p.id)); // what was already over when this phone came in isn't news
      return;
    }
    const fresh = done.find((p) => !seen.current!.has(p.id));
    if (!fresh) return;
    seen.current.add(fresh.id);
    setShow(fresh);
  }, [view.players]);
  // its own effect: the one above re-runs on every poll, which would cancel the timer again and again
  useEffect(() => {
    if (!show) return;
    const tm = setTimeout(() => setShow(null), show.status === "solved" ? 3500 : 9000);
    return () => clearTimeout(tm);
  }, [show]);
  if (!show) return null;
  const g = show.giveUp;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-canvas/80 p-6 backdrop-blur" onClick={() => setShow(null)} data-testid="celebration">
      {show.status === "solved" ? (
        <div className="pop flex flex-col items-center gap-3 text-center">
          <Star className="size-20 text-gold" fill="currentColor" />
          <p className="font-display text-2xl font-bold">{show.name}</p>
          <p className="glow-gold rounded-2xl bg-gold px-6 py-3 font-display text-4xl font-bold text-gold-ink">{show.person}</p>
          <p className="font-mono text-sm text-muted">{t("guessedIt", { n: show.questions.length })}</p>
        </div>
      ) : (
        <div className="pop glass w-full max-w-sm rounded-3xl p-5">
          <h2 className="font-display text-2xl font-bold">{t("giveUpTitle")}</h2>
          {g && g.candidates.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {g.candidates.map((c, i) => (
                <li key={c.name} className={`relative overflow-hidden rounded-xl px-3 py-2 ${c.name === show.person ? "glow-gold" : "bg-surface"}`}>
                  <span className="absolute inset-y-0 left-0 bg-jev/25" style={{ width: `${c.p * 100}%` }} />
                  <span className="relative flex justify-between text-sm">
                    <span>{i === g.pick && <Sparkles className="mr-1 inline size-3.5 text-jev" />}{c.name}</span>
                    <span className="font-mono text-xs">{Math.round(c.p * 100)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {g && g.pick >= 0 && <p className="mt-3 font-mono text-xs text-jev">{t("jevPick")}: {g.candidates[g.pick]?.name}</p>}
          <p className="mt-4 text-sm text-muted">{t("wasIt")}</p>
          <p className="font-display text-3xl font-bold text-gold">{show.person}</p>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Ear, Flag, Keyboard, Mic, SkipForward, Sparkles, Star, X } from "lucide-react";
import type { PhaseProps } from "@/app/r/[code]/page";
import type { Joker, ViewPlayer } from "@/lib/game";
import { useListener, type Clip } from "@/lib/listen";
import { Tree } from "./Tree";
import { Wave } from "./Wave";
import { Sheet } from "./Sheet";
import { Btn, heat, useLang, useVoice } from "./ui";

type Heard = { text: string; did: string };

export function Play({ view, act, code, id, refresh }: PhaseProps) {
  const { lang, t } = useLang();
  const guesser = view.players.find((p) => p.id === view.turn)!;
  const open = guesser.questions.find((q) => !q.answer);
  const iAsk = view.local || view.me === view.turn; // this phone runs the guesser's side
  const iAnswer = view.local || view.me !== view.turn; // and/or the table's side
  const as = view.local ? { as: guesser.id } : {};
  const warmth = [...guesser.questions].reverse().find((q) => q.warmth !== undefined)?.warmth ?? 0;
  const writer = view.players.find((p) => p.id === guesser.writtenBy)?.name ?? "";

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

  // ---- typing, joker, give-up ----
  const [typing, setTyping] = useState(false);
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
  const keyboard = typing || !voice || !!ear.error;
  const mine = view.me === view.turn && !view.local;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* the forehead note: the table reads the person on it, the guesser sees only a question mark */}
      <section className="rise">
        <p className="mb-2 text-lg font-semibold" data-testid="guesser-line">
          {mine ? t("yourTurn") : <><span data-testid="guesser">{guesser.name}</span> {t("asks")}</>}
        </p>
        <Note person={iAnswer ? guesser.person : ""} coverFor={view.local ? guesser.name : ""} writer={writer} warmth={warmth} open={open} />
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label={t("path")}>
        {guesser.questions.length ? (
          <Tree questions={guesser.questions} end="playing" />
        ) : iAsk && !open ? (
          <div className="flex flex-col gap-2 py-2">
            <p className="text-muted">{t("firstQ")}</p>
            {t("starters").split("|").map((q) => (
              <button key={q} onClick={() => ask(q)} className="glass min-h-12 rounded-2xl px-4 text-left font-medium transition active:scale-95">
                {q}
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-muted">{t("waitFirst", { name: guesser.name })}</p>
        )}
      </section>

      {/* the dock: whatever this phone does next, in thumb reach */}
      <section className="glass -mx-4 -mb-4 flex flex-col gap-3 rounded-t-3xl px-4 pt-4 pb-4">
        {iAnswer && open ? (
          <div className="flex flex-col gap-3" data-testid="answer-panel">
            <p className="text-2xl leading-tight font-bold text-balance">{open.text}</p>
            {open.truth !== undefined && !view.local && <JevChip truth={open.truth} guess={open.guess ?? 0} />}
            {handsFree && <Wave level={ear.level} active={ear.speaking} />}
            <div className="grid grid-cols-3 gap-2">
              <Btn tone="yes" className="min-h-16 text-lg" onClick={() => act({ type: "answer", qid: open.id, answer: "yes" })}>{t("yes")}</Btn>
              <Btn tone="no" className="min-h-16 text-lg" onClick={() => act({ type: "answer", qid: open.id, answer: "no" })}>{t("no")}</Btn>
              <Btn tone="gold" className="min-h-16 text-lg" onClick={() => act({ type: "answer", qid: open.id, answer: "yes", solved: true })}>{t("solved")}</Btn>
            </div>
          </div>
        ) : open ? (
          <div className="flex flex-col gap-1 py-2">
            <p className="text-2xl leading-tight font-bold text-balance">{open.text}</p>
            <p className="animate-pulse text-muted">{t("waitAnswer")}</p>
          </div>
        ) : iAsk ? (
          <>
            {heard && (
              <p aria-live="polite" className={`rise rounded-2xl px-3 py-2 text-sm ${heard.did === "chatter" ? "bg-no/10 text-no" : "bg-luna/10 text-luna"}`} data-testid="heard">
                <Ear className="mr-1.5 inline size-4" aria-hidden />“{heard.text}”{heard.did === "chatter" && <> — {t("chatter")}</>}
              </p>
            )}
            {ear.error && <p role="alert" className="text-sm text-no">{t("micDenied")}</p>}
            {keyboard ? (
              <form onSubmit={(e) => (e.preventDefault(), ask(text))} className="flex gap-2">
                <input autoFocus={typing} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("askPh")} aria-label={t("ask")} maxLength={200} enterKeyHint="send" className="min-h-14 w-0 flex-1 rounded-2xl border border-line bg-canvas px-4 text-lg outline-none focus:border-luna" />
                <Btn type="submit" className="min-h-14" disabled={!text.trim()}>{t("send")}</Btn>
              </form>
            ) : (
              <>
                <Wave level={ear.level} active={ear.speaking || busy} />
                <div className="flex items-center justify-between">
                  <button onClick={() => (setTyping(true), setHandsFree(false), setMicOn(false))} className="flex w-20 flex-col items-center gap-1 rounded-2xl py-1 text-sm text-muted">
                    <Keyboard className="size-6" aria-hidden /> {t("type")}
                  </button>
                  <MicButton ear={ear} busy={busy} handsFree={handsFree} onFirst={() => setMicOn(true)} />
                  <button onClick={() => (setMicOn(true), setHandsFree((h) => !h))} aria-pressed={handsFree} className={`flex w-20 flex-col items-center gap-1 rounded-2xl py-1 text-sm transition ${handsFree ? "text-luna" : "text-muted"}`}>
                    <Ear className="size-6" /> {t("handsFree")}
                  </button>
                </div>
                <p className="-mt-1 text-center text-sm text-muted">{busy ? t("thinking") : handsFree ? (ear.speaking ? t("listening") : t("handsFreeHint")) : t("holdToTalk")}</p>
              </>
            )}
            {keyboard && voice && !ear.error && (
              <button onClick={() => setTyping(false)} className="flex items-center gap-2 self-center text-sm text-muted"><Mic className="size-4" /> {t("speakInstead")}</button>
            )}
            <div className="flex gap-2">
              <Btn tone="jev" className="min-h-14 flex-1" disabled={!view.ai || guesser.jokers < 1 || jokerBusy} onClick={useJoker}>
                <Sparkles className={`size-5 ${jokerBusy ? "animate-spin" : ""}`} /> {t("joker")} <span className="font-normal opacity-70">{t("jokerLeft", { n: guesser.jokers })}</span>
              </Btn>
              {sure ? (
                <Btn tone="no" className="min-h-14" onClick={() => (setSure(false), act({ type: "giveup", ...as }))}>{t("giveUpSure")}</Btn>
              ) : (
                <Btn tone="ghost" className="min-h-14" onClick={() => setSure(true)} aria-label={t("giveUp")}><Flag className="size-5" /></Btn>
              )}
            </div>
          </>
        ) : (
          <p className="py-2 text-muted">{t("waitAsk", { name: guesser.name })}</p>
        )}
        {view.me === view.host && !iAsk && (
          <button onClick={() => act({ type: "skip" })} className="flex items-center justify-center gap-1 text-sm text-muted"><SkipForward className="size-4" /> {t("skip")}</button>
        )}
      </section>

      {joker && <JokerSheet joker={joker} onClose={() => setJoker(null)} onAsk={(q) => (setJoker(null), ask(q, { joker: true }))} />}
    </div>
  );
}

/** Jev's quiet opinion for the table: the likely true answer, and whether it's a guess of this very person */
function JevChip({ truth, guess }: { truth: number; guess: number }) {
  const { t } = useLang();
  const yes = truth >= 0.5;
  return (
    <p className="flex items-center gap-2 text-sm text-jev">
      <span className="grid size-5 place-items-center rounded-full bg-jev text-2xs font-bold text-canvas">J</span>
      {t("jevSays")} <strong className={yes ? "text-yes" : "text-no"}>{yes ? t("yes") : t("no")}</strong>
      <span className="font-mono text-muted">{Math.round(Math.max(truth, 1 - truth) * 100)}%</span>
      {guess > 0.5 && <span className="flex items-center gap-1 text-gold"><Star className="size-3.5" fill="currentColor" /> {t("rightGuess")}</span>}
    </p>
  );
}

/**
 * The sticky note on the guesser's forehead. For the table it carries the person (on a shared phone covered until held,
 * so the guesser can't glance); for the guesser a big question mark. Jev's warmth runs along its bottom edge.
 */
function Note({ person, coverFor, writer, warmth, open }: { person: string; coverFor: string; writer: string; warmth: number; open?: { truth?: number } }) {
  const { t } = useLang();
  const [peek, setPeek] = useState(false);
  const covered = !!coverFor && !peek;
  // held with a finger, or with Space/Enter from a keyboard or switch control
  const hold = coverFor
    ? {
        role: "button",
        tabIndex: 0,
        "aria-pressed": peek,
        onPointerDown: () => setPeek(true),
        onPointerUp: () => setPeek(false),
        onPointerLeave: () => setPeek(false),
        onKeyDown: (e: React.KeyboardEvent) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), setPeek(true)),
        onKeyUp: () => setPeek(false),
        onBlur: () => setPeek(false),
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};
  const pct = Math.round(warmth * 100);
  return (
    <div {...hold} className={`note relative -rotate-1 rounded-md px-5 pt-4 pb-3 text-gold-ink select-none ${coverFor ? "touch-none" : ""}`}>
      <span className="tape" aria-hidden />
      {!person ? (
        <p className="text-6xl leading-none font-bold" aria-label={t("youAre")}>?</p>
      ) : covered ? (
        <p className="py-1 text-xl leading-tight font-bold">{t("peek")}<span className="block text-base font-medium opacity-70">{t("notFor", { name: coverFor })}</span></p>
      ) : (
        <p className="text-4xl leading-tight font-bold text-balance" data-testid="person">{person}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="font-medium opacity-70">{person && !covered && writer ? t("writtenBy", { name: writer }) : t("warmth")}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-gold-ink/15" role="meter" aria-label={t("warmth")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, pct)}%`, background: heat(warmth) }} />
        </span>
        <span className="font-mono font-semibold">{pct}%</span>
      </div>
      {coverFor && peek && open?.truth !== undefined && (
        <p className="mt-2 text-sm font-medium">{t("jevSays")}: {open.truth >= 0.5 ? t("yes") : t("no")} {Math.round(Math.max(open.truth, 1 - open.truth) * 100)}%</p>
      )}
    </div>
  );
}

function MicButton({ ear, busy, handsFree, onFirst }: { ear: ReturnType<typeof useListener>; busy: boolean; handsFree: boolean; onFirst: () => void }) {
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
  const live = down || (handsFree && ear.speaking);
  return (
    <button
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={handsFree ? t("handsFree") : t("holdToTalk")}
      className={`grid size-24 touch-none place-items-center rounded-full transition duration-200 select-none ${live ? "scale-110 bg-luna text-canvas glow-luna" : handsFree ? "bg-raised text-luna glow-luna" : "bg-ink text-canvas"}`}
    >
      {busy ? <span className="size-7 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Mic className="size-10" />}
    </button>
  );
}

function JokerSheet({ joker, onClose, onAsk }: { joker: Joker; onClose: () => void; onAsk: (q: string) => void }) {
  const { t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const closed = useRef(onClose);
  useEffect(() => {
    closed.current = onClose;
  });
  // once on mount: onClose is a new function every poll, the dialog must not be reopened for it (old Safari throws)
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const done = () => closed.current();
    d?.addEventListener("close", done);
    return () => d?.removeEventListener("close", done);
  }, []);
  const max = Math.max(...joker.questions.map((q) => q.p), 0.01);
  return (
    <Sheet ref={ref} label={t("jokerTitle")} testId="joker">
      <div className="flex items-start justify-between">
        <h2 className="text-2xl font-bold"><span className="text-luna">Luna</span> × <span className="text-jev">Jev</span></h2>
        <button onClick={() => ref.current?.close()} aria-label={t("close")} className="grid size-10 place-items-center rounded-full text-muted"><X className="size-5" aria-hidden /></button>
      </div>
      <p className="-mt-2 text-sm text-muted">{t("jokerHint")}</p>
      <ul className="flex flex-col gap-2">
        {joker.questions.map((q, i) => (
          <li key={i}>
            <button onClick={() => onAsk(q.text)} className={`pop relative min-h-14 w-full overflow-hidden rounded-2xl p-3 text-left ${i === joker.best ? "glow-jev bg-raised" : "bg-surface"}`} style={{ animationDelay: `${i * 80}ms` }}>
              <span className="absolute inset-y-0 left-0 bg-jev/15" style={{ width: `${(q.p / max) * 100}%` }} aria-hidden />
              <span className="relative flex items-center justify-between gap-3">
                <span>{i === joker.best && <Sparkles className="mr-1.5 inline size-4 text-jev" aria-label={t("hotTip")} />}{q.text}</span>
                <span className="font-mono text-sm text-jev tabular-nums">{Math.round(q.p * 100)}%</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
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
    // a tap anywhere closes it; the content stays readable (a button's label would hide it from screen readers)
    <div role="dialog" aria-modal="true" aria-label={show.name} className="fixed inset-0 z-30 grid place-items-center bg-canvas/80 p-6 backdrop-blur" data-testid="celebration">
      <button type="button" aria-label={t("close")} className="absolute inset-0" onClick={() => setShow(null)} />
      {show.status === "solved" ? (
        <div className="pop pointer-events-none relative flex flex-col items-center gap-3 text-center">
          <Star className="size-20 text-gold" fill="currentColor" />
          <p className="font-display text-2xl font-bold">{show.name}</p>
          <p className="glow-gold rounded-2xl bg-gold px-6 py-3 font-display text-4xl font-bold text-gold-ink">{show.person}</p>
          <p className="font-mono text-sm text-muted">{t("guessedIt", { n: show.questions.length })}</p>
        </div>
      ) : (
        <div className="pop glass pointer-events-none relative w-full max-w-sm rounded-3xl p-5">
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
          {g && g.pick >= 0 && <p className="mt-3 text-jev">{t("jevPick")} <strong>{g.candidates[g.pick]?.name}</strong>{g.candidates[g.pick]?.name === show.person ? ` — ${t("aiKnew")}` : ""}</p>}
          <p className="mt-4 text-sm text-muted">{t("wasIt")}</p>
          <p className="font-display text-3xl font-bold text-gold">{show.person}</p>
        </div>
      )}
    </div>
  );
}

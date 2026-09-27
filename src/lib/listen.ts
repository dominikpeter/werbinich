"use client";
// The table's ear. The mic stays open on one phone, but only speech leaves it: a level detector (voice activity) cuts
// each utterance out of the stream, with 300 ms kept from before it started so the first syllable isn't lost. Silence
// costs nothing; speech-to-text is billed only for the seconds people talk. 16 kHz mono WAV works in every browser.
import { useCallback, useEffect, useRef, useState } from "react";

const RATE = 16_000;
const PRE_MS = 300; // audio kept from before speech started
const END_MS = 900; // this much quiet ends an utterance
const MIN_MS = 350; // shorter blips (a cough, a clink) are dropped
const MAX_MS = 12_000;

export type Clip = { b64: string; ms: number };

function wav(samples: Float32Array): string {
  const buf = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); buf.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true); buf.setUint32(24, RATE, true);
  buf.setUint32(28, RATE * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); w(36, "data");
  buf.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => buf.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  let bin = "";
  const bytes = new Uint8Array(buf.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * `auto`: hands-free, every utterance goes to `onClip`. Otherwise `hold()`/`release()` record one push-to-talk clip.
 * `level` (0..1) drives the mic ring. The mic opens only while `enabled`.
 */
export function useListener(enabled: boolean, auto: boolean, onClip: (c: Clip) => void) {
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<"denied" | null>(null);
  const cb = useRef(onClip);
  const autoRef = useRef(auto);
  const held = useRef(false);
  useEffect(() => {
    cb.current = onClip;
    autoRef.current = auto;
  });
  const cut = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stop = () => {};
    let dead = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
      .then((stream) => {
        if (dead) return stream.getTracks().forEach((t) => t.stop());
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        // ponytail: ScriptProcessor is deprecated but runs everywhere with no worklet file; move to AudioWorklet if it glitches
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        const ratio = ctx.sampleRate / RATE;
        let pre: Float32Array[] = [];
        let rec: Float32Array[] | null = null;
        let recMs = 0, voiceMs = 0, quietMs = 0, floor = 0.01;
        const flush = () => {
          const chunks = rec;
          rec = null;
          setSpeaking(false);
          if (!chunks || recMs < MIN_MS + PRE_MS) return;
          const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
          chunks.reduce((o, c) => (all.set(c, o), o + c.length), 0);
          cb.current({ b64: wav(all), ms: recMs });
        };
        cut.current = flush;
        proc.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const out = new Float32Array(Math.floor(input.length / ratio));
          let sum = 0;
          for (let i = 0; i < out.length; i++) {
            out[i] = input[Math.floor(i * ratio)];
            sum += out[i] * out[i];
          }
          const rms = Math.sqrt(sum / out.length);
          const ms = (out.length / RATE) * 1000;
          setLevel(Math.min(1, rms * 12));
          // the noise floor follows the room slowly (up) and quickly (down); speech is well above it
          floor = rms < floor ? floor * 0.9 + rms * 0.1 : floor * 0.995 + rms * 0.005;
          const loud = rms > Math.max(0.012, floor * 2.8);
          if (rec) {
            rec.push(out);
            recMs += ms;
            quietMs = loud ? 0 : quietMs + ms;
            if (!held.current && ((autoRef.current && quietMs > END_MS) || recMs > MAX_MS)) flush();
            return;
          }
          pre.push(out);
          while (pre.length > Math.ceil(PRE_MS / ms)) pre.shift();
          voiceMs = loud ? voiceMs + ms : 0;
          if (held.current || (autoRef.current && voiceMs > 120)) {
            rec = pre;
            pre = [];
            recMs = rec.length * ms;
            quietMs = 0;
            setSpeaking(true);
          }
        };
        src.connect(proc);
        proc.connect(ctx.destination);
        stop = () => {
          proc.disconnect();
          src.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          cut.current = null;
        };
      })
      .catch(() => setError("denied"));
    return () => {
      dead = true;
      stop();
      setLevel(0);
      setSpeaking(false);
    };
  }, [enabled]);

  const hold = useCallback(() => {
    held.current = true;
  }, []);
  const release = useCallback(() => {
    held.current = false;
    cut.current?.();
  }, []);
  return { level, speaking, error, hold, release };
}

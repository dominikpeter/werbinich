"use client";
import { useEffect, useRef } from "react";

const BARS = 36;

/**
 * The voice as it arrives: bars scroll in from the right, one per frame-sample of the mic level, mirrored around the
 * middle. Drawn on a canvas from a ref, so talking never re-renders React. Quiet: a flat line breathing slowly.
 */
export function Wave({ level, active, color = "--color-luna" }: { level: React.RefObject<number>; active: boolean; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const hist = new Array(BARS).fill(0);
    const ink = getComputedStyle(c).getPropertyValue(color).trim() || "#56d9ff";
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, t = 0, last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 45) return; // ~22 samples a second: a readable wave, not noise
      last = now;
      t++;
      const dpr = devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const idle = active ? 0 : reduce ? 0.04 : 0.04 + 0.03 * Math.sin(t / 6);
      hist.push(Math.max(idle, Math.min(1, level.current ?? 0)));
      hist.shift();
      const gap = w / BARS;
      const bw = Math.max(2, gap * 0.5);
      hist.forEach((v, i) => {
        const bh = Math.max(3, v * (h - 4));
        ctx.globalAlpha = 0.35 + 0.65 * (i / BARS); // older bars fade to the left
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.roundRect(i * gap + (gap - bw) / 2, (h - bh) / 2, bw, bh, bw / 2);
        ctx.fill();
      });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level, active, color]);
  return <canvas ref={ref} aria-hidden className="h-12 w-full" />;
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { Fortune } from "../lib/fortuneTypes";
import { FortunePool, loadFortunes } from "../lib/fortunePool";

export type CrackPhase = "idle" | "anticipation" | "breaking" | "revealed";

const TIMING = {
  normal: { anticipation: 190, breaking: 720 },
  reduced: { anticipation: 0, breaking: 60 },
};

export interface FortuneSession {
  phase: CrackPhase;
  fortune: Fortune | null;
  loading: boolean;
  crack: () => void;
  ready: boolean;
}

/**
 * Owns the cookie state machine and the locale's fortune pool.
 *
 * Phase flow: idle → anticipation → breaking → revealed. The fortune is
 * selected when the crack begins but only handed to the UI when the break
 * animation reaches the reveal point, so text never appears too early.
 */
export function useFortuneSession(
  locale: string,
  reducedMotion: boolean,
  onCrackSound: () => void,
  onReveal?: (fortune: Fortune) => void,
): FortuneSession {
  const [phase, setPhase] = useState<CrackPhase>("idle");
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [loading, setLoading] = useState(true);

  const poolRef = useRef<FortunePool | null>(null);
  if (!poolRef.current) poolRef.current = new FortunePool();
  const pool = poolRef.current;

  const timersRef = useRef<number[]>([]);
  const phaseRef = useRef<CrackPhase>("idle");
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadFortunes(locale).then((fortunes) => {
      if (!alive) return;
      pool.setFortunes(fortunes as Fortune[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [locale, pool]);

  useEffect(() => clearTimers, [clearTimers]);

  const crack = useCallback(() => {
    // Guard against duplicate triggers (double taps, key repeat) using a
    // synchronous ref so two calls before the next render cannot both pass.
    const current = phaseRef.current;
    if (current === "anticipation" || current === "breaking" || loading) return;
    clearTimers();
    phaseRef.current = "anticipation";
    onCrackSound();
    const next = pool.next();
    const timing = reducedMotion ? TIMING.reduced : TIMING.normal;

    setFortune(null);
    setPhase("anticipation");

    const t1 = window.setTimeout(() => {
      setPhase("breaking");
    }, timing.anticipation);

    const t2 = window.setTimeout(() => {
      setFortune(next);
      setPhase("revealed");
      if (next) onReveal?.(next);
    }, timing.anticipation + timing.breaking);

    timersRef.current.push(t1, t2);
  }, [loading, reducedMotion, clearTimers, onCrackSound, pool, onReveal]);

  return { phase, fortune, loading, crack, ready: !loading && pool.size > 0 };
}

import { FALLBACK_FORTUNES } from "./fallbackFortunes";
import {
  isFortuneLibrary,
  sanitizeFortune,
  type Fortune,
  type FortuneLibrary,
} from "./fortuneTypes";

const libraryCache = new Map<string, FortuneLibrary>();
const inflight = new Map<string, Promise<FortuneLibrary | null>>();

async function fetchLibrary(locale: string): Promise<FortuneLibrary | null> {
  const cached = libraryCache.get(locale);
  if (cached) return cached;
  const existing = inflight.get(locale);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}fortunes/${locale}.json`);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!isFortuneLibrary(data)) return null;
      libraryCache.set(locale, data);
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(locale);
    }
  })();
  inflight.set(locale, p);
  return p;
}

/**
 * Load a locale's fortune library. Falls back to English, then to a tiny
 * built-in set, so a cookie can always be cracked and never shows a blank or
 * broken fortune.
 */
export async function loadFortunes(locale: string): Promise<Fortune[]> {
  const lib = await fetchLibrary(locale);
  if (lib) return lib.fortunes;
  if (locale !== "en") {
    const en = await fetchLibrary("en");
    if (en) return en.fortunes;
  }
  return FALLBACK_FORTUNES.map((t, i) => ({ id: `fallback-${i}`, t, c: "hope" }));
}

/** Cryptographically-random integer in [0, max) when available. */
export function randomInt(max: number): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffled(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const RECENT_LEN = 12;

/**
 * Efficient sampling without repeats: draws from a shuffled index pool that
 * is consumed then refilled, with a short "recently seen" history that also
 * survives language switches (same pool instance is reseeded on switch).
 */
export class FortunePool {
  private fortunes: Fortune[] = [];
  private pool: number[] = [];
  private recent: number[] = [];

  setFortunes(fortunes: Fortune[]): void {
    this.fortunes = fortunes;
    this.pool = [];
    // Keep the recent history across a language switch so a visitor does not
    // see the same translation immediately after switching back and forth.
  }

  get size(): number {
    return this.fortunes.length;
  }

  private refill(): void {
    this.pool = shuffled(this.fortunes.length);
  }

  next(): Fortune | null {
    if (this.fortunes.length === 0) return null;
    if (this.pool.length === 0) this.refill();
    // Pop entries until one is not in the recent history (bounded attempts).
    let idx = -1;
    let attempts = 0;
    while (this.pool.length > 0) {
      const candidate = this.pool.pop()!;
      if (!this.recent.includes(candidate) || attempts++ > 8) {
        idx = candidate;
        break;
      }
      // push the rejected candidate back to the front so it is not lost
      this.pool.unshift(candidate);
    }
    if (idx === -1) idx = this.pool.pop() ?? this.recent[this.recent.length - 1] ?? 0;
    this.recent.push(idx);
    if (this.recent.length > Math.min(RECENT_LEN, Math.floor(this.fortunes.length / 2)))
      this.recent.shift();
    return { ...this.fortunes[idx], t: sanitizeFortune(this.fortunes[idx].t) };
  }
}

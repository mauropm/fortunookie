import { describe, expect, it, vi, beforeEach } from "vitest";
import { FortunePool, loadFortunes, randomInt } from "../../src/lib/fortunePool";
import { sanitizeFortune, isFortuneLibrary } from "../../src/lib/fortuneTypes";
import { FALLBACK_FORTUNES } from "../../src/lib/fallbackFortunes";

function makeFortunes(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t-${i}`,
    t: `Fortune number ${i} — something positive.`,
    c: "hope",
  }));
}

describe("FortunePool", () => {
  it("never repeats the immediately previous fortune", () => {
    const pool = new FortunePool();
    pool.setFortunes(makeFortunes(30));
    let prev = "";
    for (let i = 0; i < 300; i++) {
      const f = pool.next()!;
      expect(f.t).not.toBe(prev);
      prev = f.t;
    }
  });

  it("avoids the most recently shown fortunes", () => {
    const pool = new FortunePool();
    pool.setFortunes(makeFortunes(40));
    const shown: string[] = [];
    for (let i = 0; i < 200; i++) {
      const f = pool.next()!;
      const last10 = shown.slice(-10);
      expect(last10).not.toContain(f.t);
      shown.push(f.t);
    }
  });

  it("covers the whole library and refills the pool without starvation", () => {
    const pool = new FortunePool();
    pool.setFortunes(makeFortunes(25));
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pool.next()!.t);
    expect(seen.size).toBe(25);
  });

  it("keeps working after a language switch (re-seeding)", () => {
    const pool = new FortunePool();
    pool.setFortunes(makeFortunes(20));
    for (let i = 0; i < 15; i++) pool.next();
    pool.setFortunes(makeFortunes(12));
    let prev = "";
    for (let i = 0; i < 60; i++) {
      const f = pool.next()!;
      expect(f.t).not.toBe(prev);
      prev = f.t;
    }
  });

  it("survives thousands of cracks", () => {
    const pool = new FortunePool();
    pool.setFortunes(makeFortunes(2050));
    for (let i = 0; i < 5000; i++) expect(pool.next()).not.toBeNull();
  });

  it("returns null when empty", () => {
    const pool = new FortunePool();
    pool.setFortunes([]);
    expect(pool.next()).toBeNull();
  });
});

describe("randomInt", () => {
  it("stays in range", () => {
    for (let i = 0; i < 200; i++) {
      const n = randomInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });
});

describe("sanitizeFortune", () => {
  it("strips markup tags", () => {
    expect(sanitizeFortune("<script>alert(1)</script>Hello")).toBe("alert(1)Hello");
  });
  it("strips control characters", () => {
    const nul = String.fromCharCode(0);
    const esc = String.fromCharCode(27);
    const dirty = `Good${nul} morning${esc} friend`;
    const clean = sanitizeFortune(dirty);
    expect(clean).not.toContain(nul);
    expect(clean).not.toContain(esc);
    expect(clean).toContain("Good");
    expect(clean).toContain("friend");
  });
  it("collapses repeated spaces and trims", () => {
    expect(sanitizeFortune("  spaced  out  ")).toBe("spaced out");
  });
});

describe("isFortuneLibrary", () => {
  it("accepts valid libraries and rejects malformed ones", () => {
    expect(
      isFortuneLibrary({ locale: "en", count: 1, fortunes: [{ id: "a", t: "hi", c: "hope" }] }),
    ).toBe(true);
    expect(isFortuneLibrary(null)).toBe(false);
    expect(isFortuneLibrary({ locale: "en", fortunes: [] })).toBe(false);
    expect(isFortuneLibrary({ fortunes: [{ id: "a", t: "  ", c: "hope" }] })).toBe(false);
    expect(isFortuneLibrary({ fortunes: [{ id: "a", t: 3 }] })).toBe(false);
  });
});

describe("loadFortunes fallbacks", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to the built-in library when fetch fails entirely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const fortunes = await loadFortunes("en");
    expect(fortunes.length).toBe(FALLBACK_FORTUNES.length);
    expect(fortunes.every((f) => f.t.trim().length > 0)).toBe(true);
  });

  it("falls back to English when a locale file is missing", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        calls.push(url);
        if (url.includes("/fortunes/xx2.json")) return { ok: false, status: 404 };
        return {
          ok: true,
          json: async () => ({
            locale: "en",
            count: 2,
            fortunes: [
              { id: "e1", t: "Good things grow.", c: "hope" },
              { id: "e2", t: "A kind word returns.", c: "love" },
            ],
          }),
        };
      }),
    );
    const fortunes = await loadFortunes("xx2");
    expect(fortunes[0].t).toBe("Good things grow.");
    expect(calls.some((c) => c.includes("fortunes/xx2.json"))).toBe(true);
    expect(calls.some((c) => c.includes("fortunes/en.json"))).toBe(true);
  });

  it("rejects malformed JSON payloads and still returns usable fortunes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ oops: 1 }) }),
    );
    const fortunes = await loadFortunes("en2");
    expect(fortunes.length).toBeGreaterThan(0);
  });
});

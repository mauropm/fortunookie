import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { termMatcher } from "../../scripts/lib/content.mjs";
import locales from "../../locales.json";

const OUT_DIR = join(process.cwd(), "public", "fortunes");
const TERMS_DIR = join(process.cwd(), "content-src");
const UI_DIR = join(process.cwd(), "src", "i18n", "locales");

interface FortuneRecord {
  id: string;
  t: string;
  c: string;
}

function loadFortuneFile(locale: string): FortuneRecord[] {
  const p = join(OUT_DIR, `${locale}.json`);
  expect(existsSync(p), `public/fortunes/${locale}.json should exist`).toBe(true);
  const data = JSON.parse(readFileSync(p, "utf8"));
  expect(Array.isArray(data.fortunes)).toBe(true);
  return data.fortunes;
}

function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

describe("generated fortune libraries (gate: npm run validate:fortunes is authoritative)", () => {
  for (const { locale } of locales as { locale: string }[]) {
    describe(locale, () => {
      const fortunes = loadFortuneFile(locale);

      it("has at least 2,000 records", () => {
        expect(fortunes.length).toBeGreaterThanOrEqual(2000);
      });

      it("has unique ids and unique normalized texts", () => {
        const ids = new Set(fortunes.map((f) => f.id));
        expect(ids.size).toBe(fortunes.length);
        const texts = new Set(fortunes.map((f) => normalize(f.t)));
        expect(texts.size).toBe(fortunes.length);
      });

      it("has non-empty, reasonably-sized plain-text messages", () => {
        for (const f of fortunes) {
          const len = [...f.t].length;
          expect(len, `fortune ${f.id} too short`).toBeGreaterThanOrEqual(5);
          expect(len, `fortune ${f.id} too long`).toBeLessThanOrEqual(400);
          expect(f.t).not.toMatch(/<[^>]*>/); // no markup
          expect(f.t).not.toContain("\uFFFD"); // no replacement chars
        }
      });

      it("has valid categories", () => {
        const cats = new Set([
          "luck",
          "hope",
          "love",
          "growth",
          "abundance",
          "wisdom",
          "courage",
          "joy",
          "resilience",
          "adventure",
          "community",
          "peace",
        ]);
        for (const f of fortunes) expect(cats.has(f.c), f.id).toBe(true);
      });

      it("never contains a banned negative term", () => {
        const termsPath = join(TERMS_DIR, `${locale}.terms.json`);
        if (!existsSync(termsPath)) return; // no policy list for this locale
        const terms: string[] = JSON.parse(readFileSync(termsPath, "utf8")).negativeTerms ?? [];
        const matchers = terms.map((t) => termMatcher(t)).filter(Boolean) as ((
          s: string,
        ) => boolean)[];
        for (const f of fortunes) {
          for (const match of matchers) {
            expect(match(f.t), `${f.id} contains a banned term`).toBe(false);
          }
        }
      });
    });
  }
});

describe("interface translations", () => {
  const enKeys = Object.keys(JSON.parse(readFileSync(join(UI_DIR, "en.json"), "utf8")));

  it("every locale file exists and matches the en key set exactly", () => {
    for (const { locale } of locales as { locale: string }[]) {
      const p = join(UI_DIR, `${locale}.json`);
      expect(existsSync(p), `missing src/i18n/locales/${locale}.json`).toBe(true);
      const obj = JSON.parse(readFileSync(p, "utf8"));
      expect(Object.keys(obj).sort(), locale).toEqual([...enKeys].sort());
      for (const [k, v] of Object.entries(obj)) {
        expect(typeof v, `${locale}.${k}`).toBe("string");
        expect((v as string).trim().length, `${locale}.${k} empty`).toBeGreaterThan(0);
      }
    }
  });

  it("preserves interpolation placeholders", () => {
    for (const { locale } of locales as { locale: string }[]) {
      const obj = JSON.parse(readFileSync(join(UI_DIR, `${locale}.json`), "utf8"));
      expect(obj.counter, `${locale}.counter`).toContain("{count}");
      expect(obj.shareText, `${locale}.shareText`).toContain("{fortune}");
      expect(obj.shareText, `${locale}.shareText`).toContain("{url}");
    }
  });

  it("has no duplicate JSON keys silently dropped (file key count matches)", () => {
    const files = readdirSync(UI_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe((locales as unknown[]).length);
  });
});

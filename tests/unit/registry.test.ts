import { describe, expect, it } from "vitest";
import {
  detectLocale,
  isRtl,
  LOCALES,
  LOCALE_CODES,
  getLocaleMeta,
  DEFAULT_LOCALE,
} from "../../src/i18n/registry";

describe("locale registry", () => {
  it("ships exactly the 30 required locales", () => {
    expect(LOCALES).toHaveLength(30);
    expect(new Set(LOCALE_CODES).size).toBe(30);
    for (const code of [
      "en",
      "es",
      "zh",
      "hi",
      "ar",
      "fr",
      "pt",
      "bn",
      "ru",
      "id",
      "ur",
      "de",
      "ja",
      "pcm",
      "mr",
      "te",
      "tr",
      "ta",
      "vi",
      "ko",
      "it",
      "th",
      "fa",
      "sw",
      "ha",
      "yo",
      "nl",
      "pl",
      "fil",
      "he",
    ]) {
      expect(LOCALE_CODES).toContain(code);
    }
  });

  it("every locale has flag, native name, english name and dir", () => {
    for (const l of LOCALES) {
      expect(l.flag.trim().length).toBeGreaterThan(0);
      expect(l.nativeName.trim().length).toBeGreaterThan(0);
      expect(l.englishName.trim().length).toBeGreaterThan(0);
      expect(["ltr", "rtl"]).toContain(l.dir);
    }
  });

  it("marks the four RTL languages", () => {
    expect(["ar", "ur", "fa", "he"].every(isRtl)).toBe(true);
    expect(isRtl("en")).toBe(false);
    expect(getLocaleMeta("ar")?.dir).toBe("rtl");
  });
});

describe("detectLocale", () => {
  it("prefers a valid stored choice", () => {
    expect(detectLocale("ja", ["en-US"])).toBe("ja");
  });

  it("ignores a bogus stored choice", () => {
    expect(detectLocale("klingon", ["de"])).toBe("de");
  });

  it("matches browser languages", () => {
    expect(detectLocale(null, ["es-MX", "en"])).toBe("es");
    expect(detectLocale(null, ["zh-TW"])).toBe("zh");
    expect(detectLocale(null, ["pt-BR"])).toBe("pt");
    expect(detectLocale(null, ["fil-PH"])).toBe("fil");
    expect(detectLocale(null, ["tl"])).toBe("fil");
    expect(detectLocale(null, ["ar-EG"])).toBe("ar");
    expect(detectLocale(null, ["pcm"])).toBe("pcm");
    expect(detectLocale(null, ["ha-NG"])).toBe("ha");
  });

  it("falls back to English", () => {
    expect(detectLocale(null, ["sw-KE"])).toBe("sw");
    expect(detectLocale(null, ["qq", "zz"])).toBe(DEFAULT_LOCALE);
    expect(detectLocale(null, [])).toBe(DEFAULT_LOCALE);
  });
});

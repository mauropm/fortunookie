import localesData from "../../locales.json";

export interface LocaleMeta {
  locale: string;
  flag: string;
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleMeta[] = localesData as LocaleMeta[];

export const LOCALE_CODES: string[] = LOCALES.map((l) => l.locale);

const BY_CODE = new Map(LOCALES.map((l) => [l.locale, l]));

export function getLocaleMeta(code: string): LocaleMeta | undefined {
  return BY_CODE.get(code);
}

export function isRtl(code: string): boolean {
  return BY_CODE.get(code)?.dir === "rtl";
}

export const DEFAULT_LOCALE = "en";

/**
 * Resolve the best starting locale from stored preference and browser
 * languages. Falls back to English when nothing matches.
 */
export function detectLocale(stored: string | null, browserLanguages: readonly string[]): string {
  if (stored && BY_CODE.has(stored)) return stored;
  for (const raw of browserLanguages) {
    const base = raw.toLowerCase().split("-")[0];
    if (BY_CODE.has(base)) return base;
    // Map common regional variants onto our closest supported locale.
    if (base === "zh" || raw.toLowerCase().startsWith("zh")) return "zh";
    if (raw.toLowerCase().startsWith("pt")) return "pt";
    if (raw.toLowerCase().startsWith("ar")) return "ar";
    if (raw.toLowerCase().startsWith("ur")) return "ur";
    if (raw.toLowerCase().startsWith("fa")) return "fa";
    if (raw.toLowerCase().startsWith("he")) return "he";
    if (raw.toLowerCase().startsWith("fil") || raw.toLowerCase().startsWith("tl")) return "fil";
    if (raw.toLowerCase().startsWith("pcm") || raw.toLowerCase().startsWith("ni")) return "pcm";
    if (raw.toLowerCase().startsWith("ha")) return "ha";
    if (raw.toLowerCase().startsWith("yo")) return "yo";
    if (raw.toLowerCase().startsWith("sw")) return "sw";
    if (raw.toLowerCase().startsWith("bn")) return "bn";
    if (raw.toLowerCase().startsWith("mr")) return "mr";
    if (raw.toLowerCase().startsWith("te")) return "te";
    if (raw.toLowerCase().startsWith("ta")) return "ta";
  }
  return DEFAULT_LOCALE;
}

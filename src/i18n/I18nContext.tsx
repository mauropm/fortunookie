import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, detectLocale, getLocaleMeta, isRtl } from "./registry";

export type UIStrings = Record<string, string>;

const modules = import.meta.glob("./locales/*.json");

const cache = new Map<string, UIStrings>();

export async function loadUITranslation(locale: string): Promise<UIStrings> {
  if (cache.has(locale)) return cache.get(locale)!;
  const loader = modules[`./locales/${locale}.json`];
  if (!loader) return loadUITranslation(DEFAULT_LOCALE);
  try {
    const mod = (await loader()) as unknown as { default: UIStrings };
    cache.set(locale, mod.default);
    return mod.default;
  } catch {
    return locale === DEFAULT_LOCALE ? {} : loadUITranslation(DEFAULT_LOCALE);
  }
}

interface I18nValue {
  locale: string;
  dir: "ltr" | "rtl";
  strings: UIStrings;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "fc.locale";

function initialLocale(): string {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== "undefined" ? (navigator.languages ?? [navigator.language]) : [];
  return detectLocale(stored, nav.filter(Boolean) as string[]);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(initialLocale);
  const [strings, setStrings] = useState<UIStrings>({});
  const [enStrings, setEnStrings] = useState<UIStrings>({});

  useEffect(() => {
    let alive = true;
    loadUITranslation(locale).then((s) => {
      if (alive) setStrings(s);
    });
    return () => {
      alive = false;
    };
  }, [locale]);

  useEffect(() => {
    let alive = true;
    loadUITranslation(DEFAULT_LOCALE).then((s) => {
      if (alive) setEnStrings(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const meta = getLocaleMeta(locale);
    const dir = meta?.dir ?? "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    if (strings.metaTitle) document.title = strings.metaTitle;
  }, [locale, strings]);

  const setLocale = useCallback((next: string) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let out = strings[key] ?? enStrings[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
      }
      return out;
    },
    [strings, enStrings],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, dir: isRtl(locale) ? "rtl" : "ltr", strings, t, setLocale }),
    [locale, strings, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

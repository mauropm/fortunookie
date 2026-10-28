import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { LOCALES } from "../i18n/registry";
import { useI18n } from "../i18n/I18nContext";

/**
 * Searchable combobox-style language selector suitable for 30 entries.
 * Pattern: button → popover with searchbox + listbox, full keyboard support
 * (Enter/Space/Down to open, arrows to move, Enter/Space to choose, Escape to
 * close, Home/End to jump).
 */
export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = LOCALES.find((l) => l.locale === locale) ?? LOCALES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOCALES;
    return LOCALES.filter(
      (l) =>
        l.nativeName.toLowerCase().includes(q) ||
        l.englishName.toLowerCase().includes(q) ||
        l.locale.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(
        Math.max(
          0,
          filtered.findIndex((l) => l.locale === locale),
        ),
      );
      const id = window.setTimeout(() => searchRef.current?.focus(), 10);
      return () => window.clearTimeout(id);
    }
  }, [open, filtered, locale]);

  // Close on outside click / focus escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const choose = useCallback(
    (code: string) => {
      setLocale(code);
      setOpen(false);
      buttonRef.current?.focus();
    },
    [setLocale],
  );

  const onButtonKey = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e: ReactKeyboardEvent) => {
    const n = filtered.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (n ? (a + 1) % n : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (n ? (a - 1 + n) % n : 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, n - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const pick = filtered[active];
      if (pick) choose(pick.locale);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector<HTMLLIElement>(`[data-idx="${active}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [active, open]);

  return (
    <div className="lang" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("languageLabel")}: ${selected.nativeName}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
        data-testid="language-button"
      >
        <span className="lang-flag" aria-hidden="true">
          {selected.flag}
        </span>
        <span className="lang-name">{selected.nativeName}</span>
        <span className="lang-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="lang-popover" role="dialog" aria-label={t("languageLabel")}>
          <input
            ref={searchRef}
            type="search"
            className="lang-search"
            placeholder={t("searchLanguages")}
            aria-label={t("searchLanguages")}
            aria-controls="lang-listbox"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKey}
            data-testid="language-search"
          />
          <ul
            id="lang-listbox"
            ref={listRef}
            className="lang-list"
            role="listbox"
            aria-label={t("languageLabel")}
            tabIndex={-1}
            onKeyDown={onListKey}
          >
            {filtered.length === 0 && (
              <li className="lang-empty" role="presentation">
                {t("noResults")}
              </li>
            )}
            {filtered.map((l, i) => (
              <li
                key={l.locale}
                data-idx={i}
                role="option"
                aria-selected={l.locale === locale}
                className={[
                  "lang-option",
                  i === active ? "is-active" : "",
                  l.locale === locale ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(l.locale)}
                data-testid={`language-option-${l.locale}`}
              >
                <span className="lang-flag" aria-hidden="true">
                  {l.flag}
                </span>
                <span className="lang-native">{l.nativeName}</span>
                <span className="lang-english">{l.englishName}</span>
                {l.locale === locale && (
                  <span className="lang-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

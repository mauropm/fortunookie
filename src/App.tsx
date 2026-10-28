import { useCallback, useEffect, useRef, useState } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nContext";
import { LOCALES, getLocaleMeta } from "./i18n/registry";
import { useFortuneSession } from "./hooks/useFortuneSession";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { useSessionCounter } from "./hooks/useSessionCounter";
import { FortuneCookie } from "./components/FortuneCookie";
import { FortuneSlip } from "./components/FortuneSlip";
import { ShareActions } from "./components/ShareActions";
import { LanguageSelector } from "./components/LanguageSelector";
import { CookieCounter, SoundToggle, InfoFooter } from "./components/Chrome";
import { playCrackSound } from "./lib/sound";
import { SITE } from "./config";
import type { Fortune } from "./lib/fortuneTypes";

const SOUND_KEY = "fc.sound";

function Experience() {
  const { locale, dir, t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [count, increment] = useSessionCounter();
  const [crackCount, setCrackCount] = useState(0);
  const [sound, setSound] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const soundRef = useRef(sound);
  soundRef.current = sound;

  const onCrackSound = useCallback(() => {
    if (soundRef.current) playCrackSound();
  }, []);

  const onReveal = useCallback(
    (_f: Fortune) => {
      increment();
      setCrackCount((c) => c + 1);
    },
    [increment],
  );

  const { phase, fortune, loading, crack } = useFortuneSession(
    locale,
    reducedMotion,
    onCrackSound,
    onReveal,
  );

  const toggleSound = useCallback(() => {
    setSound((s) => {
      const next = !s;
      try {
        localStorage.setItem(SOUND_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  // Keep social/canonical metadata in sync with the selected language,
  // without ever reloading the page.
  useEffect(() => {
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement(selector.startsWith("link") ? "link" : "meta");
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    setMeta('meta[property="og:title"]', "content", t("metaTitle"));
    setMeta('meta[property="og:description"]', "content", t("metaDescription"));
    setMeta('meta[property="og:locale"]', "content", locale);
    setMeta('meta[name="description"]', "content", t("metaDescription"));
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = SITE.url;
  }, [locale, t]);

  const meta = getLocaleMeta(locale);

  return (
    <div className="page" data-dir={dir}>
      <header className="topbar">
        <span className="wordmark">
          <span aria-hidden="true">🥠</span> {t("brand")}
        </span>
        <div className="topbar-tools">
          <LanguageSelector />
          <SoundToggle
            enabled={sound}
            onToggle={toggleSound}
            onLabel={t("soundOn")}
            offLabel={t("soundOff")}
          />
        </div>
      </header>

      <main className="stage" id="main">
        <h1 className="headline">{t("headline")}</h1>
        <p className="subline">{t("subline")}</p>

        <div className="cookie-area">
          {phase !== "revealed" ? (
            <>
              <FortuneCookie
                key={crackCount}
                phase={phase}
                crackCount={crackCount}
                reducedMotion={reducedMotion}
                label={t("cookieAria")}
                onCrack={crack}
                meta={meta}
              />
              <p
                className={`cookie-hint ${phase !== "idle" ? "is-hidden" : ""}`}
                aria-hidden="true"
              >
                {loading ? t("loadingFortune") : t("cookieHint")}
              </p>
            </>
          ) : (
            <>
              <FortuneSlip
                phase={phase}
                fortune={fortune}
                loading={loading}
                loadingLabel={t("loadingFortune")}
                fortuneLabel={t("fortuneLabel")}
                locale={locale}
                dir={dir}
                reducedMotion={reducedMotion}
              />
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={crack}
                  data-testid="crack-another"
                >
                  {t("crackAnother")}
                </button>
                {fortune && (
                  <ShareActions
                    fortuneText={fortune.t}
                    shareTemplate={t("shareText")}
                    siteUrl={SITE.url}
                    siteName={t("brand")}
                    copyLabel={t("copy")}
                    copiedLabel={t("copied")}
                    shareLabel={t("share")}
                    downloadLabel={t("downloadCard")}
                    cardSavedLabel={t("cardSaved")}
                    locale={locale}
                    dir={dir}
                    onCopyFeedback={setStatusMessage}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <CookieCounter count={count} label={t("counter")} />

        {/* Screen-reader announcements for each revealed fortune. */}
        <div className="sr-only" role="status" aria-live="polite" data-testid="live-region">
          {phase === "revealed" && fortune ? `${t("fortuneLabel")}: ${fortune.t}` : ""}
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage ?? ""}
        </div>
      </main>

      <InfoFooter
        aboutLabel={t("footerAbout")}
        privacyLabel={t("footerPrivacy")}
        note={t("footerNote")}
        aboutHeading={t("aboutHeading")}
        aboutBody={t("aboutBody")}
        privacyHeading={t("privacyHeading")}
        privacyBody={t("privacyBody")}
        localeCount={LOCALES.length}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Experience />
    </I18nProvider>
  );
}

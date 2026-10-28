import { useCallback, useEffect, useRef, useState } from "react";
import { copyText, shareFortune } from "../lib/share";
import { downloadFortuneCard } from "../lib/fortuneCard";

interface Props {
  fortuneText: string;
  shareTemplate: string;
  siteUrl: string;
  siteName: string;
  copyLabel: string;
  copiedLabel: string;
  shareLabel: string;
  downloadLabel: string;
  cardSavedLabel: string;
  locale: string;
  dir: "ltr" | "rtl";
  onCopyFeedback: (msg: string | null) => void;
}

export function ShareActions({
  fortuneText,
  shareTemplate,
  siteUrl,
  siteName,
  copyLabel,
  copiedLabel,
  shareLabel,
  downloadLabel,
  cardSavedLabel,
  locale,
  dir,
  onCopyFeedback,
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = useCallback(
    (msg: string) => {
      setFeedback(msg);
      onCopyFeedback(msg);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setFeedback(null);
        onCopyFeedback(null);
      }, 2200);
    },
    [onCopyFeedback],
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyText(fortuneText);
    if (ok) flash(copiedLabel);
  }, [fortuneText, copiedLabel, flash]);

  const handleShare = useCallback(async () => {
    const result = await shareFortune(fortuneText, shareTemplate, siteUrl, siteName);
    if (result.via === "clipboard" && result.ok) flash(copiedLabel);
  }, [fortuneText, shareTemplate, siteUrl, siteName, copiedLabel, flash]);

  const handleDownload = useCallback(async () => {
    const ok = await downloadFortuneCard({
      fortune: fortuneText,
      locale,
      dir,
      brand: siteName,
      url: siteUrl,
    });
    if (ok) flash(cardSavedLabel);
  }, [fortuneText, locale, dir, siteName, siteUrl, cardSavedLabel, flash]);

  return (
    <div className="share-actions" dir="auto">
      <button type="button" className="btn btn-ghost" onClick={handleCopy} data-testid="copy-btn">
        <span aria-hidden="true">📋</span> {copyLabel}
      </button>
      <button type="button" className="btn btn-ghost" onClick={handleShare} data-testid="share-btn">
        <span aria-hidden="true">🔗</span> {shareLabel}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={handleDownload}
        data-testid="download-card-btn"
      >
        <span aria-hidden="true">🖼️</span> {downloadLabel}
      </button>
      <span className="copy-feedback" aria-live="polite" data-testid="copy-feedback">
        {feedback ?? ""}
      </span>
      <span className="sr-only" lang={locale} />
    </div>
  );
}

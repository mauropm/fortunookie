import { useCallback, useEffect, useRef, useState } from "react";
import { copyText, shareFortune } from "../lib/share";

interface Props {
  fortuneText: string;
  shareTemplate: string;
  siteUrl: string;
  siteName: string;
  copyLabel: string;
  copiedLabel: string;
  shareLabel: string;
  locale: string;
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
  locale,
  onCopyFeedback,
}: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = useCallback(
    (msg: string) => {
      setCopied(true);
      onCopyFeedback(msg);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
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

  return (
    <div className="share-actions" dir="auto">
      <button type="button" className="btn btn-ghost" onClick={handleCopy} data-testid="copy-btn">
        <span aria-hidden="true">📋</span> {copyLabel}
      </button>
      <button type="button" className="btn btn-ghost" onClick={handleShare} data-testid="share-btn">
        <span aria-hidden="true">🔗</span> {shareLabel}
      </button>
      <span className="copy-feedback" aria-live="polite" data-testid="copy-feedback">
        {copied ? copiedLabel : ""}
      </span>
      <span className="sr-only" lang={locale} />
    </div>
  );
}

import { useState } from "react";

interface Props {
  count: number;
  label: string;
}

export function CookieCounter({ count, label }: Props) {
  if (count === 0) return null;
  return (
    <p className="counter" data-testid="cookie-counter">
      <span aria-hidden="true">🥠</span> {label.replace("{count}", String(count))}
    </p>
  );
}

export function SoundToggle({
  enabled,
  onToggle,
  onLabel,
  offLabel,
}: {
  enabled: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      className="icon-button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? onLabel : offLabel}
      title={enabled ? onLabel : offLabel}
      onClick={onToggle}
      data-testid="sound-toggle"
    >
      <span aria-hidden="true">{enabled ? "🔊" : "🔇"}</span>
    </button>
  );
}

export function InfoFooter({
  aboutLabel,
  privacyLabel,
  note,
  aboutHeading,
  aboutBody,
  privacyHeading,
  privacyBody,
  localeCount,
}: {
  aboutLabel: string;
  privacyLabel: string;
  note: string;
  aboutHeading: string;
  aboutBody: string;
  privacyHeading: string;
  privacyBody: string;
  localeCount: number;
}) {
  const [open, setOpen] = useState<null | "about" | "privacy">(null);
  const toggle = (which: "about" | "privacy") => setOpen((o) => (o === which ? null : which));

  return (
    <footer className="footer">
      <nav className="footer-nav" aria-label="Information">
        <button
          type="button"
          className="footer-link"
          aria-expanded={open === "about"}
          onClick={() => toggle("about")}
        >
          {aboutLabel}
        </button>
        <span className="footer-dot" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          className="footer-link"
          aria-expanded={open === "privacy"}
          onClick={() => toggle("privacy")}
        >
          {privacyLabel}
        </button>
      </nav>
      {open === "about" && (
        <section className="footer-panel">
          <h2>{aboutHeading}</h2>
          <p>{aboutBody}</p>
        </section>
      )}
      {open === "privacy" && (
        <section className="footer-panel">
          <h2>{privacyHeading}</h2>
          <p>{privacyBody}</p>
        </section>
      )}
      <p className="footer-note">
        {note}{" "}
        <span className="footer-locales" data-testid="locale-count">
          {localeCount} 🌍
        </span>
      </p>
    </footer>
  );
}

import { useEffect, useRef } from "react";
import type { CrackPhase } from "../hooks/useFortuneSession";
import type { Fortune } from "../lib/fortuneTypes";

const CATEGORY_EMOJI: Record<string, string> = {
  luck: "🍀",
  hope: "✨",
  love: "💖",
  growth: "🌱",
  abundance: "💰",
  wisdom: "🧠",
  courage: "🚀",
  joy: "🌞",
  resilience: "🌈",
  adventure: "🌍",
  community: "🤝",
  peace: "🌙",
};

interface Props {
  phase: CrackPhase;
  fortune: Fortune | null;
  loading: boolean;
  loadingLabel: string;
  fortuneLabel: string;
  locale: string;
  dir: "ltr" | "rtl";
  reducedMotion: boolean;
}

export function FortuneSlip({
  phase,
  fortune,
  loading,
  loadingLabel,
  fortuneLabel,
  locale,
  dir,
  reducedMotion,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Move focus to the slip when the fortune is revealed so screen readers
  // announce it and keyboard users land on the content, not in a trap.
  useEffect(() => {
    if (phase === "revealed" && fortune && !reducedMotion) {
      const id = window.setTimeout(() => ref.current?.focus({ preventScroll: false }), 60);
      return () => window.clearTimeout(id);
    }
    if (phase === "revealed" && fortune) ref.current?.focus({ preventScroll: false });
  }, [phase, fortune, reducedMotion]);

  if (phase !== "revealed") return null;

  return (
    <div
      ref={ref}
      className="slip"
      tabIndex={-1}
      role="status"
      aria-label={fortuneLabel}
      data-testid="fortune-slip"
    >
      <span className="slip-edge slip-edge-top" aria-hidden="true" />
      <p className="slip-text" lang={locale} dir={dir} data-testid="fortune-text">
        {loading && !fortune ? loadingLabel : fortune?.t}
      </p>
      {fortune?.c && (
        <span className="slip-category" aria-hidden="true">
          {CATEGORY_EMOJI[fortune.c] ?? "🥠"}
        </span>
      )}
    </div>
  );
}

import { useMemo } from "react";
import type { CrackPhase } from "../hooks/useFortuneSession";
import type { LocaleMeta } from "../i18n/registry";

interface Crumb {
  tx: number;
  ty: number;
  r: number;
  d: number;
  size: number;
}

function seededCracks(seed: number, reduced: boolean): { crumbs: Crumb[]; sparkles: Crumb[] } {
  // Deterministic per crack number so snapshots are stable in tests,
  // but visibly varied between cracks.
  let s = seed * 2654435761 + 1013904223;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const crumbs: Crumb[] = reduced
    ? []
    : Array.from({ length: 16 }, () => {
        const angle = rnd() * Math.PI * 2;
        const dist = 60 + rnd() * 90;
        return {
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist * 0.55 + 40 + rnd() * 30,
          r: rnd() * 320 - 160,
          d: rnd() * 120,
          size: 3 + rnd() * 5,
        };
      });
  const sparkles: Crumb[] = reduced
    ? []
    : Array.from({ length: 8 }, () => {
        const angle = rnd() * Math.PI * 2;
        const dist = 70 + rnd() * 80;
        return {
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist * 0.7 - 20,
          r: 0,
          d: 100 + rnd() * 220,
          size: 4 + rnd() * 5,
        };
      });
  return { crumbs, sparkles };
}

const LEFT_JAG = "L108 40 L126 64 L108 88 L124 112 L110 138 L120 188";

interface Props {
  phase: CrackPhase;
  crackCount: number;
  reducedMotion: boolean;
  label: string;
  onCrack: () => void;
  meta: LocaleMeta | undefined;
}

export function FortuneCookie({ phase, crackCount, reducedMotion, label, onCrack }: Props) {
  const { crumbs, sparkles } = useMemo(
    () => seededCracks(crackCount + 1, reducedMotion),
    [crackCount, reducedMotion],
  );

  const breaking = phase === "breaking";
  const revealed = phase === "revealed";

  return (
    <button
      type="button"
      className={[
        "cookie-button",
        phase === "anticipation" ? "is-anticipation" : "",
        breaking ? "is-breaking" : "",
        revealed ? "is-gone" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onCrack}
      aria-label={label}
      data-testid="cookie"
      data-phase={phase}
    >
      <span className="cookie-float" aria-hidden="true">
        <span className="cookie-inner">
          <span className="cookie-shadow" />
          <svg viewBox="0 0 240 200" className="cookie-svg" focusable="false">
            <defs>
              <linearGradient id="cookieBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#eab873" />
                <stop offset="0.55" stopColor="#d99f56" />
                <stop offset="1" stopColor="#b97c33" />
              </linearGradient>
              <linearGradient id="cookieEdge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#a86e2c" />
                <stop offset="1" stopColor="#8c5a22" />
              </linearGradient>
            </defs>
            <g className="half half-left">
              <path
                d={`M120 12 ${LEFT_JAG} C71.4 188 32 148.6 32 100 C32 51.4 71.4 12 120 12 Z`}
                fill="url(#cookieBody)"
                stroke="url(#cookieEdge)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M52 128 C70 108 84 96 106 92"
                fill="none"
                stroke="#a8702d"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                d="M58 70 C74 62 92 60 108 66"
                fill="none"
                stroke="#a8702d"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.4"
              />
              <ellipse cx="66" cy="96" rx="5" ry="4" fill="#a8702d" opacity="0.3" />
              <ellipse cx="96" cy="140" rx="6" ry="4" fill="#a8702d" opacity="0.25" />
              <path
                d="M60 40 C78 26 100 22 116 28"
                fill="none"
                stroke="#ffe2ae"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.5"
              />
            </g>
            <g className="half half-right">
              <path
                d={`M120 12 ${LEFT_JAG} C168.6 188 208 148.6 208 100 C208 51.4 168.6 12 120 12 Z`}
                fill="url(#cookieBody)"
                stroke="url(#cookieEdge)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M188 128 C170 108 156 96 134 92"
                fill="none"
                stroke="#a8702d"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                d="M182 70 C166 62 148 60 132 66"
                fill="none"
                stroke="#a8702d"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.4"
              />
              <ellipse cx="174" cy="96" rx="5" ry="4" fill="#a8702d" opacity="0.3" />
              <ellipse cx="146" cy="142" rx="6" ry="4" fill="#a8702d" opacity="0.25" />
              <path
                d="M124 28 C142 20 164 22 180 36"
                fill="none"
                stroke="#ffe2ae"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.4"
              />
            </g>
          </svg>
          {breaking && (
            <span className="crumbs" data-testid="crumbs">
              {crumbs.map((c, i) => (
                <span
                  key={i}
                  className="crumb"
                  style={
                    {
                      "--tx": `${c.tx}px`,
                      "--ty": `${c.ty}px`,
                      "--r": `${c.r}deg`,
                      "--d": `${c.d}ms`,
                      width: `${c.size}px`,
                      height: `${c.size}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {sparkles.map((c, i) => (
                <span
                  key={`s${i}`}
                  className="sparkle"
                  style={
                    {
                      "--tx": `${c.tx}px`,
                      "--ty": `${c.ty}px`,
                      "--d": `${c.d}ms`,
                      width: `${c.size}px`,
                      height: `${c.size}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

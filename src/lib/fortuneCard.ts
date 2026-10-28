// Downloadable fortune card: renders the fortune on a warm "tea house" card
// using the Canvas 2D API — no external libraries, no server.
//
// Text layout is separated from painting (via an injected measure function)
// so it is unit-testable without a canvas implementation.

export interface CardOptions {
  fortune: string;
  locale: string;
  dir: "ltr" | "rtl";
  brand: string;
  url: string;
}

export interface TextLayout {
  fontPx: number;
  lineHeightPx: number;
  lines: string[];
  truncated: boolean;
}

const DISPLAY_FONT =
  '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Noto Serif", "Noto Serif Devanagari", "Noto Serif Arabic", "Noto Serif Hebrew", "Noto Serif Thai", "Noto Serif CJK SC", serif';

// Same jagged split as the on-screen cookie, drawn with Path2D.
const JAG = "L108 40 L126 64 L108 88 L124 112 L110 138 L120 188";
const LEFT_PATH = `M120 12 ${JAG} C71.4 188 32 148.6 32 100 C32 51.4 71.4 12 120 12 Z`;
const RIGHT_PATH = `M120 12 ${JAG} C168.6 188 208 148.6 208 100 C208 51.4 168.6 12 120 12 Z`;

type MeasureFn = (line: string, fontPx: number) => number;

/** Segment text into break opportunities. Uses Intl.Segmenter where present
 *  (correct for Thai/CJK), falls back to spaces then single code points. */
function segments(text: string, locale: string): string[] {
  const SegConstructor = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: "grapheme" | "word" | "sentence" },
      ) => { segment(input: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (SegConstructor) {
    try {
      const seg = new SegConstructor(locale, { granularity: "word" });
      return [...seg.segment(text)].map((s) => s.segment);
    } catch {
      /* fall through */
    }
  }
  const bySpace = text.split(/(\s+)/).filter((s) => s !== "");
  if (bySpace.length > 1) return bySpace;
  return [...text];
}

/**
 * Greedy wrap with progressive font shrinking. Returns at most
 * maxLines lines; overflow is cut with an ellipsis.
 */
export function layoutFortuneText(
  text: string,
  opts: {
    maxWidthPx: number;
    lineHeightFactor?: number;
    sizes?: number[];
    maxLines?: number;
    locale?: string;
  },
  measure: MeasureFn,
): TextLayout {
  const sizes = opts.sizes ?? [62, 56, 50, 44, 38, 32];
  const maxLines = opts.maxLines ?? 10;
  const lhf = opts.lineHeightFactor ?? 1.5;
  let truncated = false;

  for (const fontPx of sizes) {
    const words = segments(text, opts.locale ?? "en");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current + word;
      if (current !== "" && measure(candidate.trimStart(), fontPx) > opts.maxWidthPx) {
        lines.push(current.trim());
        current = word.trimStart();
      } else {
        current = candidate;
      }
    }
    if (current.trim()) lines.push(current.trim());
    if (
      lines.length <= maxLines &&
      lines.every((l) => measure(l, fontPx) <= opts.maxWidthPx * 1.02)
    ) {
      return { fontPx, lineHeightPx: Math.round(fontPx * lhf), lines, truncated: false };
    }
    if (fontPx === sizes[sizes.length - 1]) {
      truncated = true;
      const kept = lines.slice(0, maxLines);
      const last = kept[kept.length - 1] ?? "";
      let cut = last;
      while (cut.length > 1 && measure(`${cut}…`, fontPx) > opts.maxWidthPx) {
        cut = cut.slice(0, -1);
      }
      kept[kept.length - 1] = `${cut.trimEnd()}…`;
      return { fontPx, lineHeightPx: Math.round(fontPx * lhf), lines: kept, truncated };
    }
  }
  // Unreachable, but keeps TS happy.
  return { fontPx: sizes[sizes.length - 1], lineHeightPx: 48, lines: [text], truncated: true };
}

interface Canvas2D {
  scale(x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  fill(path?: Path2D | string): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(path?: Path2D | string): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): {
    addColorStop(offset: number, color: string): void;
  };
  font: string;
  fillStyle: string | CanvasGradient;
  strokeStyle: string | CanvasGradient;
  textAlign: string;
  textBaseline: string;
  direction: string;
  lineWidth: number;
  lineJoin: string;
  measureText(text: string): { width: number };
}

const W = 1080;
const H = 1350;

function starPath(cx: number, cy: number, r: number): Path2D {
  const p = new Path2D();
  const w = r * 0.34;
  p.moveTo(cx, cy - r);
  p.lineTo(cx + w, cy - w);
  p.lineTo(cx + r, cy);
  p.lineTo(cx + w, cy + w);
  p.lineTo(cx, cy + r);
  p.lineTo(cx - w, cy + w);
  p.lineTo(cx - r, cy);
  p.lineTo(cx - w, cy - w);
  p.closePath();
  return p;
}

/** Paint the card onto a ready 1080x1350 canvas. Returns false if painting is impossible. */
export function paintFortuneCard(ctx: Canvas2D, opts: CardOptions): boolean {
  ctx.save();

  // Background: warm cream gradient + dotted paper grain.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#faf3e3");
  bg.addColorStop(1, "#f0dfba");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(67, 48, 31, 0.06)";
  for (let y = 14; y < H; y += 26) {
    for (let x = 14 + ((y / 26) % 2) * 13; x < W; x += 26) {
      ctx.fillRect(x, y, 2.2, 2.2);
    }
  }

  // Honey zigzag band near the top.
  ctx.fillStyle = "#e3a83c";
  ctx.beginPath();
  const tooth = 54;
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 26);
  for (let x = W; x >= 0; x -= tooth) {
    ctx.lineTo(x - tooth / 2, 58);
    ctx.lineTo(Math.max(x - tooth, 0), 26);
  }
  ctx.closePath();
  ctx.fill();

  // Cookie, drawn from the same paths as the on-screen SVG.
  ctx.save();
  ctx.translate((W - 240 * 1.5) / 2, 130);
  ctx.scale(1.5, 1.5);
  const body = ctx.createLinearGradient(0, 12, 0, 188);
  body.addColorStop(0, "#eab873");
  body.addColorStop(0.55, "#d99f56");
  body.addColorStop(1, "#b97c33");
  ctx.fillStyle = body;
  ctx.strokeStyle = "#8c5a22";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  const left = new Path2D(LEFT_PATH);
  const right = new Path2D(RIGHT_PATH);
  ctx.fill(left);
  ctx.fill(right);
  ctx.stroke(left);
  ctx.stroke(right);
  ctx.restore();

  // Sparkles around the cookie.
  ctx.fillStyle = "#d9b45b";
  for (const [x, y, r] of [
    [180, 250, 12],
    [900, 230, 15],
    [240, 470, 9],
    [850, 480, 11],
    [540, 120, 10],
  ] as const) {
    ctx.fill(starPath(x, y, r));
  }

  // Fortune text, centered, RTL-aware.
  const measure = (line: string, fontPx: number) => {
    ctx.font = `${fontPx}px ${DISPLAY_FONT}`;
    return ctx.measureText(line).width;
  };
  const layout = layoutFortuneText(
    opts.fortune,
    { maxWidthPx: 880, maxLines: 10, locale: opts.locale },
    measure,
  );
  ctx.font = `${layout.fontPx}px ${DISPLAY_FONT}`;
  ctx.fillStyle = "#43301f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = opts.dir;
  const textTop = 590;
  const blockHeight = layout.lines.length * layout.lineHeightPx;
  const startY = textTop + Math.max(0, (720 - blockHeight) / 2) + layout.lineHeightPx / 2;
  layout.lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, startY + i * layout.lineHeightPx);
  });

  // Footer: brand + URL.
  ctx.fillStyle = "#7a6a55";
  ctx.font = `bold 40px ${DISPLAY_FONT}`;
  ctx.fillText(opts.brand, W / 2, H - 120);
  ctx.fillStyle = "#c98a1e";
  ctx.font = `bold 34px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  ctx.fillText(opts.url.replace(/^https?:\/\//, ""), W / 2, H - 62);

  ctx.restore();
  return true;
}

/**
 * Render the card and trigger a PNG download. Resolves false (never throws)
 * when the canvas or download APIs are unavailable, so the UI can fall back
 * to copy/share gracefully.
 */
export async function downloadFortuneCard(opts: CardOptions): Promise<boolean> {
  try {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d") as Canvas2D | null;
    if (!ctx || typeof canvas.toBlob !== "function") return false;
    if (!paintFortuneCard(ctx, opts)) return false;

    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), "image/png");
      } catch {
        resolve(null);
      }
    });
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortune-cookie-${opts.locale}.png`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  } catch {
    return false;
  }
}

import { describe, expect, it, vi } from "vitest";
import {
  layoutFortuneText,
  paintFortuneCard,
  downloadFortuneCard,
} from "../../src/lib/fortuneCard";

// jsdom does not implement Path2D; painting only needs a chainable shape object.
class Path2DStub {
  moveTo() {}
  lineTo() {}
  closePath() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Path2D ??= Path2DStub;

// Simulated monospace-ish metrics: every character is fontPx*0.5 wide.
const measure = (line: string, fontPx: number) => line.length * fontPx * 0.5;

describe("layoutFortuneText", () => {
  it("wraps long text into multiple fitted lines", () => {
    const text =
      "May your morning tea be warm, your path be green, and every small door you knock on open wide and without hesitation today.";
    const layout = layoutFortuneText(text, { maxWidthPx: 400 }, measure);
    expect(layout.lines.length).toBeGreaterThan(1);
    // Segmenters may split punctuation from words; compare with whitespace removed.
    expect(layout.lines.join("").replace(/\s+/g, "")).toBe(text.replace(/\s+/g, ""));
    expect(layout.truncated).toBe(false);
    for (const line of layout.lines) {
      expect(measure(line, layout.fontPx)).toBeLessThanOrEqual(400 * 1.02);
    }
  });

  it("shrinks the font for long fortunes before wrapping aggressively", () => {
    const long = "Blessing ".repeat(40).trim();
    const layout = layoutFortuneText(long, { maxWidthPx: 300, maxLines: 10 }, measure);
    expect(layout.fontPx).toBeLessThan(62);
    expect(layout.lines.length).toBeLessThanOrEqual(10);
  });

  it("truncates with an ellipsis when text exceeds the line budget", () => {
    const huge = "word ".repeat(500).trim();
    const layout = layoutFortuneText(huge, { maxWidthPx: 300, maxLines: 6 }, measure);
    expect(layout.truncated).toBe(true);
    expect(layout.lines.length).toBe(6);
    expect(layout.lines[5].endsWith("…")).toBe(true);
  });

  it("keeps short single-line fortunes intact at full size", () => {
    const layout = layoutFortuneText("Good luck finds you.", { maxWidthPx: 880 }, measure);
    expect(layout.lines).toEqual(["Good luck finds you."]);
    expect(layout.fontPx).toBe(62);
  });

  it("wraps unspaced CJK text into non-empty fitting lines", () => {
    const cjk = "愿你的每一天都充满阳光和希望，好运正在来的路上。".repeat(4);
    const layout = layoutFortuneText(cjk, { maxWidthPx: 300, locale: "zh" }, measure);
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.every((l) => l.length > 0)).toBe(true);
    expect(layout.lines.join("").length).toBe(cjk.length);
  });
});

function makeStubCtx() {
  const calls: string[] = [];
  const ctx = {
    calls,
    font: "",
    fillStyle: "",
    strokeStyle: "",
    textAlign: "",
    textBaseline: "",
    direction: "",
    lineWidth: 0,
    lineJoin: "",
    scale: vi.fn(),
    fillRect: vi.fn(),
    fillText: (t: string) => calls.push(`text:${t}`),
    fill: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    measureText: (t: string) => ({ width: t.length * 20 }),
  };
  return ctx;
}

describe("paintFortuneCard", () => {
  const base = {
    fortune: "May good fortune follow you.",
    locale: "en",
    dir: "ltr" as const,
    brand: "Fortune Cookie",
    url: "https://example.com",
  };

  it("paints the fortune, brand and URL LTR", () => {
    const ctx = makeStubCtx();
    expect(paintFortuneCard(ctx as never, base)).toBe(true);
    const all = ctx.calls.join("|");
    expect(all).toContain("text:May good fortune follow you.");
    expect(all).toContain("text:Fortune Cookie");
    expect(all).toContain("text:example.com");
    expect(ctx.direction).toBe("ltr");
    expect(ctx.textAlign).toBe("center");
  });

  it("sets RTL text direction for right-to-left locales", () => {
    const ctx = makeStubCtx();
    paintFortuneCard(ctx as never, {
      ...base,
      locale: "ar",
      dir: "rtl",
      fortune: "حظ سعيد لك اليوم.",
    });
    expect(ctx.direction).toBe("rtl");
    expect(ctx.calls.some((c) => c.includes("حظ سعيد"))).toBe(true);
  });

  it("never throws for pathological input", () => {
    const ctx = makeStubCtx();
    expect(() =>
      paintFortuneCard(ctx as never, { ...base, fortune: "🙂".repeat(900), locale: "und" }),
    ).not.toThrow();
  });
});

describe("downloadFortuneCard", () => {
  it("resolves false without throwing when canvas is unavailable (jsdom)", async () => {
    await expect(
      downloadFortuneCard({
        fortune: "Be kind.",
        locale: "en",
        dir: "ltr",
        brand: "FC",
        url: "https://example.com",
      }),
    ).resolves.toBe(false);
  });
});

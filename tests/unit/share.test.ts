import { describe, expect, it, vi, beforeEach } from "vitest";
import { composeShareText, copyText, shareFortune } from "../../src/lib/share";

beforeEach(() => {
  vi.unstubAllGlobals();
  (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockReset();
});

describe("composeShareText", () => {
  it("fills placeholders literally", () => {
    expect(composeShareText("🥠 {fortune} — {url}", "Be kind.", "https://x.example")).toBe(
      "🥠 Be kind. — https://x.example",
    );
  });
  it("leaves template untouched when placeholders absent", () => {
    expect(composeShareText("no placeholders", "f", "u")).toBe("no placeholders");
  });
});

describe("copyText", () => {
  it("uses the async clipboard when available", async () => {
    await expect(copyText("hello")).resolves.toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when clipboard API throws", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    document.execCommand = vi.fn().mockReturnValue(true);
    await expect(copyText("hello")).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false when nothing is available", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = vi.fn(() => {
      throw new Error("nope");
    });
    await expect(copyText("hello")).resolves.toBe(false);
  });
});

describe("shareFortune", () => {
  it("uses the Web Share API where supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const res = await shareFortune("Be kind.", "{fortune} {url}", "https://f.example", "FC");
    expect(res).toEqual({ ok: true, via: "web-share" });
    expect(share).toHaveBeenCalledWith({
      title: "FC",
      text: "Be kind. https://f.example",
      url: "https://f.example",
    });
    delete (navigator as { share?: unknown }).share;
  });

  it("treats a cancelled share as a no-op (no clipboard fallback)", async () => {
    const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(abort),
    });
    const res = await shareFortune("Be kind.", "{fortune}", "https://f.example", "FC");
    expect(res.ok).toBe(false);
    expect(res.via).toBe("web-share");
    delete (navigator as { share?: unknown }).share;
  });

  it("falls back to clipboard on desktop", async () => {
    const res = await shareFortune("Be kind.", "{fortune} {url}", "https://f.example", "FC");
    expect(res.ok).toBe(true);
    expect(res.via).toBe("clipboard");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Be kind. https://f.example");
  });

  it("reports failure gracefully when no API works", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    document.execCommand = vi.fn(() => {
      throw new Error("nope");
    });
    const res = await shareFortune("Be kind.", "{fortune}", "https://f.example", "FC");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("clipboard-unavailable");
  });
});

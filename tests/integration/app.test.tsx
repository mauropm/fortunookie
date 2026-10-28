import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

// Deterministic tiny libraries per locale so assertions are exact.
const LIBS: Record<string, { fortunes: { id: string; t: string; c: string }[] }> = {
  en: {
    fortunes: Array.from({ length: 6 }, (_, i) => ({
      id: `en-${i}`,
      t: `English fortune number ${i}, may it bring you joy.`,
      c: "hope",
    })),
  },
  ja: {
    fortunes: Array.from({ length: 6 }, (_, i) => ({
      id: `ja-${i}`,
      t: `日本語のfortune ${i} — 良い一日を。`,
      c: "luck",
    })),
  },
  ar: {
    fortunes: Array.from({ length: 6 }, (_, i) => ({
      id: `ar-${i}`,
      t: `حظ سعيد رقم ${i} — يوم جميل في انتظارك.`,
      c: "joy",
    })),
  },
};

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      const m = url.match(/fortunes\/([a-z]+)\.json/);
      if (m && LIBS[m[1]]) {
        return { ok: true, json: async () => ({ locale: m[1], ...LIBS[m[1]] }) };
      }
      return { ok: false, status: 404 };
    }),
  );
}

const WAIT = { timeout: 4000 };

async function crackCookie(user: ReturnType<typeof userEvent.setup>) {
  const cookie = await screen.findByTestId("cookie", {}, WAIT);
  await user.click(cookie);
  return screen.findByTestId("fortune-text", {}, WAIT);
}

describe("Fortune Cookie experience", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    stubFetch();
  });

  it("shows the hero and an interactive cookie on first visit", async () => {
    render(<App />);
    expect(await screen.findByTestId("cookie", {}, WAIT)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("cracking the cookie reveals a fortune and announces it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const slip = await crackCookie(user);
    expect(LIBS.en.fortunes.map((f) => f.t)).toContain(slip.textContent);
    await waitFor(() => {
      expect(screen.getByTestId("live-region").textContent).toContain("English fortune number");
    }, WAIT);
  });

  it("increments the session counter on each reveal", async () => {
    const user = userEvent.setup();
    render(<App />);
    await crackCookie(user);
    await waitFor(() => {
      expect(screen.getByTestId("cookie-counter").textContent).toContain("1");
    }, WAIT);
    await user.click(screen.getByTestId("crack-another"));
    await screen.findByTestId("fortune-text", {}, WAIT);
    await waitFor(() => {
      expect(screen.getByTestId("cookie-counter").textContent).toContain("2");
    }, WAIT);
  });

  it("cracking again immediately never repeats the same fortune", async () => {
    const user = userEvent.setup();
    render(<App />);
    const first = await crackCookie(user);
    const firstText = first.textContent;
    await user.click(screen.getByTestId("crack-another"));
    await screen.findByTestId("fortune-text", {}, WAIT);
    const second = await screen.findByTestId("fortune-text", {}, WAIT);
    expect(second.textContent).not.toBe(firstText);
    expect(second.textContent).not.toBe("");
  });

  it("ignores duplicate triggers during the break animation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const cookie = await screen.findByTestId("cookie", {}, WAIT);
    await user.click(cookie);
    await user.click(cookie); // rapid second tap while animating
    await screen.findByTestId("fortune-text", {}, WAIT);
    await waitFor(() => {
      expect(screen.getByTestId("cookie-counter").textContent).toContain("1");
    }, WAIT);
    // Still exactly one after the animation settles.
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.getByTestId("cookie-counter").textContent).toContain("1");
    expect(screen.getByTestId("cookie-counter").textContent).not.toContain("2");
  });

  it("switching language updates the interface and future fortunes without reload", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByTestId("language-button", {}, WAIT));
    await user.type(await screen.findByTestId("language-search", {}, WAIT), "日本語");
    await user.click(await screen.findByTestId("language-option-ja", {}, WAIT));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("ja");
    }, WAIT);
    expect(localStorage.getItem("fc.locale")).toBe("ja");

    const slip = await crackCookie(user);
    expect(LIBS.ja.fortunes.map((f) => f.t)).toContain(slip.textContent);
  });

  it("applies RTL layout for Arabic", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByTestId("language-button", {}, WAIT));
    await user.type(await screen.findByTestId("language-search", {}, WAIT), "العربية");
    await user.click(await screen.findByTestId("language-option-ar", {}, WAIT));
    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
    }, WAIT);
    const slip = await crackCookie(user);
    expect(LIBS.ar.fortunes.map((f) => f.t)).toContain(slip.textContent);
  });

  it("copies the fortune to the clipboard with feedback", async () => {
    const user = userEvent.setup();
    // userEvent replaces navigator.clipboard on setup — install our spy after.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);
    const slip = await crackCookie(user);
    await user.click(screen.getByTestId("copy-btn"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(slip.textContent);
    }, WAIT);
    await waitFor(() => {
      expect(screen.getByTestId("copy-feedback").textContent).toContain("Copied");
    }, WAIT);
  });

  it("never shows a blank fortune when content fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    const slip = await crackCookie(user);
    expect(slip.textContent!.trim().length).toBeGreaterThan(10);
  });

  it("supports keyboard cracking with Enter", async () => {
    const user = userEvent.setup();
    render(<App />);
    const cookie = await screen.findByTestId("cookie", {}, WAIT);
    cookie.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByTestId("fortune-text", {}, WAIT)).toBeInTheDocument();
  });
});

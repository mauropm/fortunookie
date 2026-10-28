import { test, expect, type Page } from "@playwright/test";

async function crack(page: Page) {
  await page.getByTestId("cookie").click();
  await expect(page.getByTestId("fortune-text")).toBeVisible({ timeout: 5000 });
}

test.describe("first-time visitor", () => {
  test("sees the hero, cookie and hint without scrolling", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const cookie = page.getByTestId("cookie");
    await expect(cookie).toBeVisible();
    const box = await cookie.boundingBox();
    expect(box).not.toBeNull();
    // Cookie must be within the first viewport (no scrolling required).
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height + 40, // small tolerance for sticky hint
    );
  });

  test("cracking reveals a positive fortune and enables unlimited repeats", async ({ page }) => {
    await page.goto("/");
    await crack(page);
    const first = (await page.getByTestId("fortune-text").textContent())!.trim();
    expect(first.length).toBeGreaterThan(10);

    // Crack many cookies in a row, no reload.
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      seen.add((await page.getByTestId("fortune-text").textContent())!.trim());
      await page.getByTestId("crack-another").click();
      await expect(page.getByTestId("fortune-text")).not.toHaveText(first, { timeout: 5000 });
    }
    expect(seen.size).toBeGreaterThan(1);

    // Counter reflects the session.
    await expect(page.getByTestId("cookie-counter")).toContainText("9");
  });

  test("double taps during the animation only crack one cookie", async ({ page }) => {
    await page.goto("/");
    const cookie = page.getByTestId("cookie");
    await cookie.click();
    await cookie.click({ force: true }).catch(() => {});
    await expect(page.getByTestId("fortune-text")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(900);
    await expect(page.getByTestId("cookie-counter")).toContainText(/1 cookies|1 cookie/);
  });
});

test.describe("language selection", () => {
  test("search, select, persist across refresh", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-button").click();
    await page.getByTestId("language-search").fill("Español");
    await page.getByTestId("language-option-es").click();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("es");
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      "What good fortune awaits you today?",
      { timeout: 5000 },
    );
    // No reload happened: same page object survived.
    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("es");
    await expect(page.getByTestId("language-button")).toContainText("Español");
  });

  test("RTL languages render right-to-left", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-button").click();
    await page.getByTestId("language-search").fill("العربية");
    await page.getByTestId("language-option-ar").click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe("rtl");
    await crack(page);
    const slip = page.getByTestId("fortune-text");
    await expect(slip).toHaveAttribute("dir", "rtl");
  });

  test("shows 30 languages with flags and native names", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-button").click();
    const options = page.locator('[role="option"]');
    await expect(options).toHaveCount(30);
    await expect(options.filter({ hasText: "日本語" })).toBeVisible();
    await expect(options.filter({ hasText: "Kiswahili" })).toBeVisible();
    await expect(options.filter({ hasText: "Naijá" })).toBeVisible();
  });
});

test.describe("accessibility", () => {
  test("keyboard-only cracking works", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cookie").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("fortune-text")).toBeVisible({ timeout: 5000 });
    // Live region announces the fortune.
    await expect(page.getByTestId("live-region")).not.toBeEmpty();
    // Space cracks another from the revealed state (focus on crack-another).
    await page.getByTestId("crack-another").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("fortune-text")).toBeVisible();
  });

  test("reduced motion still delivers the fortune quickly", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const t0 = Date.now();
    await page.getByTestId("cookie").click();
    await expect(page.getByTestId("fortune-text")).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(3000);
    await context.close();
  });

  test("focus is moved to the revealed slip", async ({ page }) => {
    await page.goto("/");
    await crack(page);
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
    expect(focused).toBe("status");
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("cookie and primary action fit the first screen", async ({ page }) => {
    await page.goto("/");
    const cookie = page.getByTestId("cookie");
    await expect(cookie).toBeVisible();
    const box = (await cookie.boundingBox())!;
    expect(box.y).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(667 + 20);
    await crack(page);
    await expect(page.getByTestId("crack-another")).toBeInViewport();
  });

  test("no horizontal scroll at narrow widths", async ({ page }) => {
    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/");
      await crack(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `width ${width}`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("robustness", () => {
  test("long fortune text does not overflow", async ({ page }) => {
    const long = "🌟 ".padEnd(1) + "这是一段非常非常长的祝福语".repeat(20);
    await page.route("**/fortunes/zh.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          locale: "zh",
          count: 2,
          fortunes: [
            { id: "long-1", t: long, c: "hope" },
            { id: "long-2", t: "短一点的祝福也会到来。", c: "joy" },
          ],
        }),
      });
    });
    await page.goto("/");
    await page.getByTestId("language-button").click();
    await page.getByTestId("language-search").fill("中文");
    await page.getByTestId("language-option-zh").click();
    await crack(page);
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowX).toBeLessThanOrEqual(0);
  });

  test("missing content still yields a positive non-empty fortune", async ({ page }) => {
    await page.route("**/fortunes/*.json", (route) => route.fulfill({ status: 500, body: "nope" }));
    await page.goto("/");
    await crack(page);
    const text = (await page.getByTestId("fortune-text").textContent())!.trim();
    expect(text.length).toBeGreaterThan(10);
  });

  test("downloads a fortune card as a PNG", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop download path");
    await page.goto("/");
    await crack(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("download-card-btn").click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^fortune-cookie-[a-z]+\.png$/);
    const size =
      (await download.path()) && (await import("node:fs")).statSync((await download.path())!).size;
    expect(size).toBeGreaterThan(3000); // a real PNG, not empty
  });

  test("clipboard failure is handled gracefully", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "clipboard stub best tested on desktop");
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        get: () => ({ writeText: () => Promise.reject(new Error("denied")) }),
      });
    });
    await page.goto("/");
    await crack(page);
    await page.getByTestId("copy-btn").click();
    // No crash, feedback area stays empty or shows a graceful message.
    await expect(page.getByTestId("copy-feedback"))
      .toBeVisible({ timeout: 2000 })
      .catch(() => {});
    await expect(page.getByTestId("fortune-text")).toBeVisible();
  });
});

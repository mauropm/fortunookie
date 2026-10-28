# Measured Performance & Build Results

Measured 2026-10-28 with Lighthouse 12 against the production build served by
`vite preview` (local loopback) on Apple Silicon macOS; Chromium from Playwright
(chromium-1248).

## Lighthouse — mobile (Moto G4 emulation, simulated throttling)

| Category       | Score   | Target |     |
| -------------- | ------- | ------ | --- |
| Performance    | **98**  | 90+    | ✅  |
| Accessibility  | **100** | 95+    | ✅  |
| Best Practices | **100** | 95+    | ✅  |
| SEO            | **100** | 90+    | ✅  |

## Lighthouse — desktop preset

| Category       | Score |
| -------------- | ----- |
| Performance    | 100   |
| Accessibility  | 100   |
| Best Practices | 96*   |
| SEO            | 100   |

\* Desktop run predates the CSP `frame-ancestors` meta cleanup; the mobile rerun
after the fix scored 100. `frame-ancestors` is delivered via the Nginx header in
production.

## Initial payload (first visit, en)

| Asset                                               | Transfer (gzip) |
| --------------------------------------------------- | --------------- |
| HTML + CSS + app JS + React + icons + locale chunks | ~64 KB          |
| `/fortunes/en.json`                                 | ~29 KB          |
| **Total first-visit transfer**                      | **~94 KB**      |

Only the selected locale's UI chunk (~1–1.5 KB gz) and fortune file (~15–30 KB gz)
are fetched — never all 30 locales.

## Build output

- `dist/assets/index-*.js` — 30.25 kB raw / **10.92 kB gz** (app)
- `dist/assets/react-*.js` — 140.94 kB raw / **45.24 kB gz** (react + react-dom)
- 30 lazy locale chunks (1.8–2.4 kB each) + 30 fortune JSON files (~200 kB raw each)
- Fonts: **zero webfont bytes** — system stacks with Noto fallbacks cover all 30 scripts.

## Content gate (actual run)

`npm run validate:fortunes` → 30/30 locales, 2,050 records each, **61,500 total**,
0 exact duplicates, 0 negative-term hits, 0 Unicode issues. See `docs/CONTENT_REPORT.md`.

## Test suite (actual run)

- Vitest: **205/205 passed** (7 files, incl. fortune-card layout/paint tests)
- Playwright: **28 passed, 2 skipped** (desktop-only clipboard-stub and card-download
  tests skipped on the mobile project)

## Caveats

- Lighthouse ran on a fast local machine over loopback; real-world network latency
  will vary. Brotli was not enabled locally (Nginx `gzip` configured, brotli optional).
- No third-party services were involved in any measurement.

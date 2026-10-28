# Fortune Cookie — Implementation Plan

Goal: a delightful, static-first, multilingual fortune-cookie website that runs on a
~1 vCPU / 1 GB Linux VPS with no database and no paid APIs.

## 1. Architecture

- **Vite + React 18 + TypeScript**, compiled to fully static assets (`dist/`).
- No SSR, no server runtime, no database. Fortune content is delivered as static JSON
  (`/fortunes/<locale>.json`), fetched lazily per locale and cached in memory +
  service worker.
- Interface translations are Vite code-split chunks (`src/i18n/locales/*.json` via
  `import.meta.glob`) — a visitor downloads only their own locale's strings (~1–2 KB
  gzipped) and only their own locale's fortune file.
- A tiny service worker (network-first HTML, cache-first assets/content, version-stamped
  per build) enables offline use after the first visit.
- **Why not Astro/Next?** The whole product is one interactive screen; React gives us
  precise control over the animation state machine and the interactive combobox, and
  Vite emits exactly what a static Nginx root needs. No server features are required,
  so a framework with SSR machinery would only add payload and build complexity.

## 2. Components

| Component                                | Responsibility                                                  |
| ---------------------------------------- | --------------------------------------------------------------- |
| `App` / `Experience`                     | Composition, sound + counter state, meta tag sync               |
| `FortuneCookie`                          | SVG cookie art, phase-driven break animation, crumbs + sparkles |
| `FortuneSlip`                            | Paper slip reveal, focus management, RTL-aware text             |
| `LanguageSelector`                       | Searchable combobox for 30 locales, full keyboard support       |
| `ShareActions`                           | Copy (clipboard + execCommand fallback) and Web Share           |
| `Chrome` (counter, sound toggle, footer) | Session counter, sound switch, about/privacy                    |
| `hooks/useFortuneSession`                | Crack state machine + locale pool ownership                     |
| `lib/fortunePool`                        | Shuffle-pool sampling, recent-history anti-repeat, fallbacks    |

Crack flow: `idle → anticipation (~190 ms) → breaking (~720 ms) → revealed`. The next
fortune is drawn when the crack starts but is only handed to the UI at the reveal
timeout, so text never appears early. A synchronous ref lock blocks duplicate triggers.

## 3. Content strategy

- Authored seed files (`content-src/<locale>.json`) per locale: ~120 fully hand-written
  `core` fortunes (10 per category × 12 categories) plus `openings` (40), `themes` (44)
  and `closings` (34) pools of complete, standalone, positive sentences.
- `scripts/generate-fortunes.mjs` deterministically (seeded mulberry32 PRNG) combines the
  pools in balanced coprime-step rotations across 4 structural patterns and appends the
  core set → **2,050 unique records per locale** (61,500 total), committed under
  `public/fortunes/`.
- `scripts/validate-fortunes.mjs` fails below 2,000/locale and checks exact/near
  duplicates, length bounds, Unicode health, categories, and per-locale negative-term
  policy; it writes `content-report.json` + `docs/CONTENT_REPORT.md`.
- Regenerating needs no app code change and no external service:
  `npm run generate:fortunes && npm run validate:fortunes`.

**Honest limitation:** seed sentences were authored by AI-assisted native-script writers
with heavy structural variety (not template token-swaps), but they have not each had an
independent native-speaker editorial pass. Treat `content-src/*.terms.json` + the
validator as the safety net and route reviewer findings back into the seed files.

## 4. Localization

- 30 locales declared once in `locales.json` (flag, native name, English name, dir) —
  shared by app and scripts. Flags are cultural hints, not language definitions; edit
  `locales.json` to remap.
- `dir` is applied to `<html>` on language change (ar/ur/fa/he RTL); the slip also sets
  `lang`/`dir` on its own text node.
- Locale persisted in `localStorage`; browser-language detection with regional mapping
  (zh-TW→zh, pt-BR→pt, tl→fil, …).
- Fonts: system stacks with Noto fallback naming — zero webfont payload, full script
  coverage on every major OS.

## 5. Animation design

Pure CSS + SVG. Two jagged SVG half-paths transition out under gravity-like easing;
16 crumbs + 8 sparkles fly via CSS keyframes with per-particle custom properties
(deterministic per crack index). The slip scales/unfolds with a settle, its text fades
in after a delay. `prefers-reduced-motion` removes float/wobble/particles and collapses
timings to ~60 ms without ever gating access to the fortune.

## 6. Testing

- **Unit** (Vitest): pool sampling/anti-repeat/refill, fallback chain, sanitization,
  share/clipboard fallbacks, locale detection, counter, per-locale content gates.
- **Integration** (Vitest + Testing Library): crack → reveal → counter, no-repeat,
  double-tap lock, language switch (incl. RTL), copy, offline fallback, keyboard.
- **E2E** (Playwright, Chromium + Pixel 7): first visit, 9× cracking, language search +
  persistence across reload, RTL, keyboard, reduced motion, 320 px overflow, missing
  API/content resilience.
- **Content**: `npm run validate:fortunes` is the authoritative content gate.

## 7. Deployment

Static `dist/` on Nginx (or `docker compose up` with the unprivileged nginx image).
Nginx config ships compression, immutable hashing for `/assets/`, revalidated JSON
caching, `no-cache` for HTML/sw, security headers. TLS via certbot/Caddy. Rollback =
flip the symlink back to the previous `dist` copy.

## 8. Acceptance criteria

See "Definition of Done" in the root prompt; the binding automated gates are:
`tsc -b` clean, `npm run lint` clean, `npm test` green,
`npm run validate:fortunes` green (≥2,000/locale), `npm run test:e2e` green,
production build serves with locale files lazy-loaded.

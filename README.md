# 🥠 Fortune Cookie — A little luck for everyone

Crack a cookie, get a positive fortune — free, instantly, in **30 languages**, with a
satisfying break animation, crumbs, sparkles and a paper slip reveal. No login, no ads,
no limits, no tracking. A static-first app designed to run on the cheapest VPS you can
find.

```
npm install
npm run dev
```

Then open http://localhost:5173 and crack something open.

---

## Table of contents

- [What you get](#what-you-get)
- [Commands](#commands)
- [Architecture](#architecture)
- [The 30 languages](#the-30-languages)
- [Fortune content pipeline](#fortune-content-pipeline)
- [Testing](#testing)
- [Deploying to a small VPS](#deploying-to-a-small-vps)
- [Maintenance & operations](#maintenance--operations)
- [Troubleshooting](#troubleshooting)

## What you get

- Signature cookie-crack animation: idle float → anticipation wobble → jagged SVG halves
  flying apart under gravity easing → 16 crumbs + 8 sparkles → paper slip unfold →
  localized fortune. Pure CSS/SVG, no canvas, no animation library.
- Searchable language selector (flags + native names) with full keyboard support,
  persistence, browser-language detection, RTL for Arabic/Urdu/Persian/Hebrew.
- ≥ 2,000 validated unique positive fortunes per locale (61,500+ total), loaded lazily
  per locale — a visitor never downloads the whole library.
- Copy + Web Share with graceful desktop fallback; original crack sound synthesized via
  Web Audio (opt-in, off by default); session cookie counter in `sessionStorage`.
- Offline-capable service worker, dark mode, reduced-motion mode, WCAG 2.2 AA-minded
  semantics (live regions, focus management, 44 px targets).

## Commands

| Command                        | What it does                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                  | Local dev server (Vite)                                                                                                      |
| `npm run build`                | Type-check + production build to `dist/`                                                                                     |
| `npm run preview`              | Serve the production build locally                                                                                           |
| `npm test`                     | Unit + integration tests (Vitest)                                                                                            |
| `npm run test:e2e`             | Playwright e2e (needs `npm run build` first; Chromium auto-installed by `npx playwright install chromium`)                   |
| `npm run lint`                 | ESLint + Prettier check                                                                                                      |
| `npm run generate:fortunes`    | Regenerate `public/fortunes/*.json` from `content-src/` seeds (deterministic)                                                |
| `npm run validate:fortunes`    | **Gate:** fail unless every locale has ≥2,000 unique valid fortunes; writes `content-report.json` + `docs/CONTENT_REPORT.md` |
| `npm run report:fortunes`      | Seed-pool + counts summary to `docs/CONTENT_SOURCES.md`                                                                      |
| `node scripts/build-icons.mjs` | Re-render `og.png` / `apple-touch-icon.png` from SVGs                                                                        |

## Architecture

One static page. Vite + React + TypeScript. Everything ships as flat files:

- Fortune JSON: `public/fortunes/<locale>.json` (~200 KB raw per locale, fetched lazily
  and cached by browser + service worker; ~15–25 KB gzipped).
- UI strings: per-locale code-split chunks, only the selected language is fetched.
- No database, no server code, no external APIs, no client-side keys.

Key source map:

```
src/
  App.tsx                  # composition + meta sync
  components/              # FortuneCookie, FortuneSlip, LanguageSelector, ShareActions, Chrome
  hooks/                   # useFortuneSession (crack state machine), counter, reduced motion
  i18n/                    # provider, registry, locale JSON
  lib/                     # fortune pool, loader + fallbacks, share, sound, types
  styles/                  # design tokens + app styles
content-src/<locale>.json  # authored seed pools (the human-editable content)
public/fortunes/*.json     # generated fortune library (committed, validated)
scripts/                   # generator, validator, report, icon renderer
```

Why not Astro/Next? The product is a single interactive screen; there is nothing to
server-render. React + Vite gives precise animation state control and emits exactly what
Nginx needs to serve. Fewer moving parts = cheaper hosting and fewer upgrades.

## The 30 languages

en 🇺🇸 · es 🇲🇽 · zh 🇨🇳 · hi 🇮🇳 · ar 🇸🇦 · fr 🇫🇷 · pt 🇧🇷 · bn 🇧🇩 · ru 🇷🇺 · id 🇮🇩 · ur 🇵🇰 · de 🇩🇪 · ja 🇯🇵 · pcm 🇳🇬 · mr 🇮🇳 · te 🇮🇳 · tr 🇹🇷 · ta 🇮🇳 · vi 🇻🇳 · ko 🇰🇷 · it 🇮🇹 · th 🇹🇭 · fa 🇮🇷 · sw 🇹🇿 · ha 🇳🇬 · yo 🇳🇬 · nl 🇳🇱 · pl 🇵🇱 · fil 🇵🇭 · he 🇮🇱

Flags mark a cultural/locale reference, not the language itself (several languages share
a country; edit `locales.json` to remap — the app and scripts both read it). RTL:
`ar`, `ur`, `fa`, `he`. To add or change a language: `locales.json` +
`src/i18n/locales/<code>.json` + `content-src/<code>.json` + `content-src/<code>.terms.json`,
then run the content commands.

## Fortune content pipeline

Deterministic, offline, reviewable:

1. **Author seeds** (`content-src/<locale>.json`): ~120 hand-written `core` fortunes
   spanning 12 positive categories, plus `openings`/`themes`/`closings` pools of
   complete standalone sentences in the target language (see
   [`docs/CONTENT_AUTHORING.md`](docs/CONTENT_AUTHORING.md)).
2. **Generate**: `npm run generate:fortunes` mixes pools in seeded, balanced rotations
   with 4 length patterns + the core set → 2,050 unique records/locale, written to
   `public/fortunes/` and committed.
3. **Validate**: `npm run validate:fortunes` fails the build unless every locale has
   ≥ 2,000 unique, valid, positive records (dupes, near-dupes, Unicode, length,
   categories, per-locale banned-term lists). Reports: `content-report.json`,
   `docs/CONTENT_REPORT.md`.

To add fortunes: grow the seed pools, re-run generate + validate. Never edit
`public/fortunes/*.json` by hand — they are generated.

**Localization quality caveat:** seeds were written natively (idioms, cultural imagery)
with automated duplicate/policy checks, but have not all received an independent
native-speaker editorial review. Budget a review pass per language before launch; fixes
belong in `content-src/`.

## Testing

- `npm test` — 42 unit/integration tests: pool anti-repeat & refill, fallback chain
  (locale → English → built-in), sanitizer, share/clipboard fallbacks, locale detection,
  RTL, counter, crack lock, per-locale content gates, UI key/placeholder completeness.
- `npm run test:e2e` — Playwright on the production build: first-visit without scroll,
  unlimited cracking, no immediate repeats, language search/persistence across reload,
  RTL, keyboard-only, reduced motion, 320 px no-overflow, long-text overflow, missing
  content/API resilience.
- Lighthouse: run `npm run build && npm run preview` then Lighthouse against
  `http://localhost:4173` (see README results section below / measured values in
  `docs/`).

## Deploying to a small VPS

Static files only — 512 MB–1 GB RAM, 1 vCPU, ~500 MB disk is plenty.

### Option A — plain Nginx (recommended)

```bash
# On your workstation:
npm ci && npm run generate:fortunes && npm run validate:fortunes && npm run build

# Ship it (keep releases as numbered dirs for instant rollback):
scp -r dist/ user@vps:/var/www/fortune-cookie/releases/2026-10-28
ssh user@vps 'ln -sfn /var/www/fortune-cookie/releases/2026-10-28 /var/www/fortune-cookie/current'
```

Then install [`nginx.conf`](nginx.conf) to `/etc/nginx/sites-available/fortune-cookie`,
set `server_name` and `root /var/www/fortune-cookie/current`, enable the symlink, and
`sudo nginx -t && sudo systemctl reload nginx`.

### TLS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot rewrites the server block for HTTPS and auto-renews.

### DNS

Create an `A` record (`@` → VPS IPv4) and optionally `AAAA` for IPv6. Wait for
propagation, then request the certificate.

### Option B — Docker

```bash
docker compose up -d --build   # unprivileged nginx on :8080
```

Put Caddy or Nginx + certbot in front for TLS. The image has a built-in healthcheck,
runs as a non-root uid, and the build stage re-runs content validation so a bad dataset
can never ship.

### Resource expectations

- RAM: ~30–60 MB nginx; no app server.
- Disk: ~15 MB per release (`dist/`).
- Bandwidth: initial HTML+JS+CSS ≈ 150 KB (45 KB gz JS chunk incl. React + 11 KB app +
  CSS); one locale's fortune file ~15–25 KB gz, cached by the SW after first use.
- A 1 vCPU/1 GB box comfortably serves thousands of visitors/day, and could be fronted
  by any CDN if traffic grows.

## Maintenance & operations

- **Deploy/rollback**: releases are immutable directories; rollback = repoint the
  `current` symlink and reload nginx (seconds). Service workers revalidate HTML and
  version-stamp their cache per build, so visitors get the new version on next navigation.
- **Logs**: `/var/log/nginx/access.log`, `error.log`. Add logrotate (usually default) and
  consider `apt install goaccess` for quick stats — the app itself collects nothing.
- **Upgrades**: update Node LTS for building; `npm audit` periodically; rebuild the
  nginx base image monthly. No runtime to patch on the static path.
- **Privacy**: no cookies set, no analytics, no PII. Language + sound prefs live in
  `localStorage`, session counter in `sessionStorage` — all on-device.

## Troubleshooting

| Symptom                                                        | Likely cause / fix                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Blank page                                                     | Check console; ensure `dist/` is the served root and `/assets/*` return 200                             |
| Old content after deploy                                       | Hard refresh; verify `/sw.js` is served with `no-cache`                                                 |
| A locale shows fallback fortunes                               | Its `/fortunes/<locale>.json` 404s — run `generate:fortunes` + redeploy                                 |
| Cookie shows a generic English fortune after a language switch | Only when that locale's file AND English both failed to load (built-in fallback); check network tab     |
| Validation fails for a locale                                  | Seed pools shrank or a banned term matched — read `content-report.json`, fix `content-src/`, regenerate |
| Playwright "browser not found"                                 | `npx playwright install chromium`                                                                       |

## License

MIT — see [LICENSE](LICENSE).

# Content Authoring Specification

This project needs **at least 2,000 unique, positive, naturally localized fortunes per locale**
(30 locales). Fortunes are produced by a deterministic generator (`scripts/generate-fortunes.mjs`)
from hand-authored _seed files_. This document defines the seed-file format and quality rules.

## Seed file: `content-src/<locale>.json`

```json
{
  "locale": "xx",
  "punct": { "join": ". ", "end": "." },
  "core": [{ "c": "luck", "t": "A complete, hand-written fortune message." }],
  "openings": ["complete first sentence WITHOUT trailing punctuation", "..."],
  "themes": ["complete middle sentence WITHOUT trailing punctuation", "..."],
  "closings": ["complete closing sentence WITHOUT trailing punctuation", "..."]
}
```

### Required sizes per locale

| Pool       | Minimum | What it is                                                                      |
| ---------- | ------- | ------------------------------------------------------------------------------- |
| `core`     | 110     | Fully authored standalone fortunes, spread across all 12 categories (≥ 8 each)  |
| `openings` | 36      | Complete opening sentences (setting / occasion / encouragement)                 |
| `themes`   | 40      | Complete middle sentences (opportunity, virtue, growth, kindness, prosperity …) |
| `closings` | 30      | Complete closing blessings / affirmations                                       |

The generator combines `openings × themes × closings` in balanced rotations with the `core`
fortunes to produce **2,050 records** per locale. Every pool sentence must be able to stand
alone as a sentence; the generator joins pieces with `punct.join` and ends with `punct.end`.

### Punctuation (`punct`)

- Default (most languages): `{ "join": ". ", "end": "." }`
- Chinese (zh) / Japanese (ja): `{ "join": "。", "end": "。" }`
- Pool sentences must contain **no trailing sentence punctuation** (`. ! ? 。 ، ۔ ۔ ؛`), no quotes.
- Commas, colons, and mid-sentence punctuation are fine.

### Categories (`c`) — use exactly these codes

`luck`, `hope`, `love`, `growth`, `abundance`, `wisdom`, `courage`, `joy`, `resilience`,
`adventure`, `community`, `peace`

| Code       | Theme                              |
| ---------- | ---------------------------------- |
| luck       | Good luck, fortunate opportunities |
| hope       | Hope, new beginnings               |
| love       | Love, friendship, kindness         |
| growth     | Personal growth, self-discovery    |
| abundance  | Prosperity, success, abundance     |
| wisdom     | Wisdom, clarity, good decisions    |
| courage    | Courage, ambition, achievement     |
| joy        | Happiness, gratitude, everyday joy |
| resilience | Resilience, overcoming challenges  |
| adventure  | Adventure, travel, discovery       |
| community  | Community, generosity, connection  |
| peace      | Peace, balance, reflection         |

## Quality rules

1. Write in the **target language and native script** (e.g. हिन्दी, العربية, 日本語, Kiswahili).
2. Positive, uplifting, warm, hopeful. Suitable for children and adults, worldwide.
3. Natural, idiomatic phrasing — **not** literal translations of English. Localize idioms and
   cultural references. Sentences must be grammatically complete on their own (they may be
   concatenated with other complete sentences).
4. Variety: vary sentence openings, structures, and imagery. No two pool sentences may be
   near-identical (no swapping a single adjective/noun).
5. NEVER negative: no threats, curses, bad omens, illness, death, loss, violence, fear.
6. No medical/financial guarantees; no claims of actually predicting the future.
7. No copyrighted quotes or attributed quotations.
8. Most messages: one short sentence (roughly 40–120 characters, adjusted to the script).
   Occasional longer ones are fine.
9. Keep pool sentences stylistically compatible so that `Opening. Theme. Closing.` reads as a
   coherent mini-blessing (independent positive sentences joined together is the intended style).
10. RTL languages (ar, ur, fa, he): plain Unicode text, no embedded direction hacks.
11. Nigerian Pidgin (pcm): natural West African Pidgin English ("Your morning go start fine today").
    Hausa/Yoruba/Swahili: natural native phrasing.
12. Keep each file valid JSON (UTF-8, no trailing commas).

## UI translation file: `src/i18n/locales/<locale>.json`

Flat JSON with EXACTLY these keys (values translated into the target language; keep `{count}`,
`{fortune}`, `{url}` placeholders verbatim; keep "Fortune Cookie" brand or a natural equivalent):

```json
{
  "metaTitle": "…",
  "metaDescription": "…",
  "brand": "…",
  "headline": "…",
  "subline": "…",
  "cookieHint": "Crack your cookie",
  "cookieAria": "…(accessible description of the interactive cookie)",
  "crackAnother": "Crack another cookie",
  "copy": "Copy fortune",
  "copied": "Copied to clipboard",
  "share": "Share fortune",
  "soundOn": "Sound on",
  "soundOff": "Sound off",
  "languageLabel": "Language",
  "searchLanguages": "Search languages",
  "noResults": "No languages found",
  "counter": "{count} cookies cracked this session",
  "footerAbout": "About",
  "footerPrivacy": "Privacy",
  "footerNote": "Made with good wishes for everyone.",
  "aboutHeading": "About Fortune Cookie",
  "aboutBody": "…",
  "privacyHeading": "Privacy",
  "privacyBody": "…",
  "shareText": "…{fortune}…{url}…",
  "loadingFortune": "Loading your fortune…",
  "fortuneLabel": "Your fortune",
  "offlineNote": "You are offline — your cached fortunes still work!"
}
```

Notes: `aboutBody` = short friendly description of the site (no promises of prediction).
`privacyBody` = state that no personal data is collected, no tracking, everything stays on device.
`shareText` = e.g. "🥠 {fortune} — Crack your own at {url}".

## Negative terms file: `content-src/<locale>.terms.json`

```json
{ "locale": "xx", "negativeTerms": ["word1", "word2", "…"] }
```

List 15–40 words/phrases that must NEVER appear in a positive fortune in this language
(death, kill, curse, disaster, disease, insult, bad omen …). The validator flags any fortune
containing them (case-insensitive, word-boundary where the script supports it). Avoid terms with
common benign homographs (e.g. do NOT list German "die").

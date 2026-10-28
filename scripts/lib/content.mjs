// Shared helpers for the content pipeline.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SEED_DIR = join(ROOT, "content-src");
export const OUT_DIR = join(ROOT, "public", "fortunes");

export const CATEGORIES = [
  "luck",
  "hope",
  "love",
  "growth",
  "abundance",
  "wisdom",
  "courage",
  "joy",
  "resilience",
  "adventure",
  "community",
  "peace",
];

export const MIN_FORTUNES = 2000;
export const TARGET_FORTUNES = 2050;

export const RTL_LOCALES = new Set(["ar", "ur", "fa", "he"]);

// Locales whose scripts do not use spaces between words.
export const NON_SPACED_SCRIPTS = new Set(["zh", "ja", "th"]);

// FNV-1a 32-bit hash → seed for the PRNG so generation is deterministic.
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Mulberry32 PRNG — deterministic, dependency-free.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function firstCoprime(steps, n) {
  for (const s of steps) if (gcd(s, n) === 1 && n > s) return s;
  for (const s of steps) if (gcd(s, n) === 1) return s;
  return 1;
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

const TRAILING_PUNCT = /[.,!?;:，。．،،۔؛।॥、！？\s]+$/u;

export function stripTrailing(s) {
  return s.trim().replace(TRAILING_PUNCT, "").trim();
}

// Normalize a fortune for duplicate comparison: NFKC, casefold, strip
// punctuation/symbols, collapse whitespace.
export function normalizeText(s) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

// Token signature for near-duplicate detection. Character bigrams for
// non-spaced scripts, word tokens otherwise.
export function signature(s, locale) {
  const norm = normalizeText(s);
  if (NON_SPACED_SCRIPTS.has(locale)) {
    const set = new Set();
    for (let i = 0; i < norm.length - 1; i++) set.add(norm.slice(i, i + 2));
    return set;
  }
  return new Set(norm.split(" ").filter(Boolean));
}

export function jaccard(a, b) {
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

export function loadSeed(locale) {
  const p = join(SEED_DIR, `${locale}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function loadTerms(locale) {
  const p = join(SEED_DIR, `${locale}.terms.json`);
  if (!existsSync(p)) return [];
  try {
    const data = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(data.negativeTerms) ? data.negativeTerms : [];
  } catch {
    return [];
  }
}

export function loadGenerated(locale) {
  const p = join(OUT_DIR, `${locale}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

// Build a case-insensitive matcher for a negative term that works for
// scripts both with and without word boundaries.
export function termMatcher(term) {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  if (/^[\p{L}\p{N}\p{M}_]+$/u.test(t)) {
    // Word-like term: use lookaround boundaries that treat letters/marks as
    // word characters (works for Arabic, Devanagari, CJK too).
    const re = new RegExp(
      `(?<![\\p{L}\\p{M}\\p{N}])${escapeRegExp(t)}(?![\\p{L}\\p{M}\\p{N}])`,
      "iu",
    );
    return (text) => re.test(text);
  }
  const lower = t;
  return (text) => text.toLowerCase().includes(lower);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasUnicodeProblems(s) {
  if (s.includes("\uFFFD")) return "replacement character";
  if (/Ã[\u0080-\u00BF©®°±²³´µ¸¹º»¼½¾¿]/.test(s)) return "suspected mojibake";
  // C0 control characters are never allowed in fortune text.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) return "control characters";
  return null;
}

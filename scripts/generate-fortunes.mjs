#!/usr/bin/env node
// Deterministic fortune generator.
//
// Reads hand-authored seed files from content-src/<locale>.json and produces
// public/fortunes/<locale>.json with >= TARGET_FORTUNES unique records per
// locale. Generation is fully deterministic: same seeds → same output.
//
// Record sources:
//   1. "core" — fully authored standalone fortunes (with category).
//   2. combos — balanced rotations over openings × themes × closings pools,
//      mixed across 4 structural patterns so fortunes vary in length.
//
// Usage: node scripts/generate-fortunes.mjs [locale ...]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  SEED_DIR,
  OUT_DIR,
  CATEGORIES,
  TARGET_FORTUNES,
  hashString,
  mulberry32,
  seededShuffle,
  firstCoprime,
  stripTrailing,
  normalizeText,
  loadSeed,
} from "./lib/content.mjs";

const STEPS = [11, 13, 17, 19, 23, 29, 31, 37, 7, 5, 3];

function requireSeed(locale) {
  const seed = loadSeed(locale);
  if (!seed) throw new Error(`Missing seed file content-src/${locale}.json`);
  const problems = [];
  if (!Array.isArray(seed.core) || seed.core.length < 110)
    problems.push(`core pool too small (${seed.core?.length ?? 0} < 110)`);
  if (!Array.isArray(seed.openings) || seed.openings.length < 36)
    problems.push(`openings pool too small (${seed.openings?.length ?? 0} < 36)`);
  if (!Array.isArray(seed.themes) || seed.themes.length < 40)
    problems.push(`themes pool too small (${seed.themes?.length ?? 0} < 40)`);
  if (!Array.isArray(seed.closings) || seed.closings.length < 30)
    problems.push(`closings pool too small (${seed.closings?.length ?? 0} < 30)`);
  if (problems.length)
    throw new Error(`Seed content-src/${locale}.json invalid: ${problems.join("; ")}`);
  return seed;
}

function categoryForIndex(i, n) {
  return CATEGORIES[Math.floor((i * CATEGORIES.length) / n) % CATEGORIES.length];
}

export function generateLocale(locale, verbose = true) {
  const seed = requireSeed(locale);
  const rng = mulberry32(hashString(`fortune-cookie:${locale}:v1`));

  const joinStr = seed.punct?.join ?? ". ";
  const endStr = seed.punct?.end ?? ".";

  const openings = seed.openings.map((s) => stripTrailing(s)).filter(Boolean);
  const themes = seed.themes.map((s) => stripTrailing(s)).filter(Boolean);
  const closings = seed.closings.map((s) => stripTrailing(s)).filter(Boolean);

  const shuffledOpenings = seededShuffle(openings, rng);
  const shuffledThemes = seededShuffle(themes, rng);
  const shuffledClosings = seededShuffle(closings, rng);

  const stepO = firstCoprime(STEPS, shuffledOpenings.length);
  const stepT = firstCoprime(STEPS, shuffledThemes.length);
  const stepC = firstCoprime(STEPS, shuffledClosings.length);

  const taken = new Set();
  const combosSeen = new Set();
  const records = [];

  // 1. Core fortunes.
  for (const item of seed.core) {
    const text = stripTrailing(item.t);
    const key = normalizeText(text);
    if (!text || taken.has(key)) continue;
    if (!CATEGORIES.includes(item.c)) {
      if (verbose) console.warn(`  [warn] ${locale}: unknown category "${item.c}" — using "hope"`);
    }
    taken.add(key);
    records.push({ t: text, c: CATEGORIES.includes(item.c) ? item.c : "hope" });
  }

  // 2. Balanced combinations.
  const patterns = [(o, t, c) => [o, t, c], (o, t) => [o, t], (t, c) => [t, c], (o, c) => [o, c]];
  const maxAttempts = (TARGET_FORTUNES - records.length) * 40;
  let i = 0;
  let attempts = 0;
  while (records.length < TARGET_FORTUNES && attempts < maxAttempts) {
    attempts++;
    const oi = (i * stepO) % shuffledOpenings.length;
    const ti = (i * stepT) % shuffledThemes.length;
    const ci = (i * stepC) % shuffledClosings.length;
    const p = i % patterns.length;
    const comboKey = `${p}:${oi}:${ti}:${ci}`;
    i++;
    if (combosSeen.has(comboKey)) continue;
    combosSeen.add(comboKey);
    const pieces = patterns[p](shuffledOpenings[oi], shuffledThemes[ti], shuffledClosings[ci]);
    const text = pieces.join(joinStr) + endStr;
    const key = normalizeText(text);
    if (taken.has(key)) continue;
    taken.add(key);
    const c =
      p === 1 || p === 3
        ? categoryForIndex(oi, shuffledOpenings.length)
        : categoryForIndex(ti, shuffledThemes.length);
    records.push({ t: text, c });
  }

  if (records.length < TARGET_FORTUNES) {
    throw new Error(
      `${locale}: only produced ${records.length} unique records (< ${TARGET_FORTUNES}). ` +
        `Grow the seed pools (openings=${shuffledOpenings.length}, themes=${shuffledThemes.length}, closings=${shuffledClosings.length}).`,
    );
  }

  // Shuffle final order (stable across runs) and assign IDs.
  const finalRecords = seededShuffle(records, rng).map((r, idx) => ({
    id: `${locale}-${String(idx + 1).padStart(5, "0")}`,
    t: r.t,
    c: r.c,
  }));

  mkdirSync(OUT_DIR, { recursive: true });
  const out = { locale, count: finalRecords.length, fortunes: finalRecords };
  writeFileSync(join(OUT_DIR, `${locale}.json`), JSON.stringify(out) + "\n", "utf8");
  if (verbose) console.log(`  ✓ ${locale}: ${finalRecords.length} fortunes`);
  return finalRecords.length;
}

function main() {
  const allLocales = JSON.parse(readFileSync(join(ROOT, "locales.json"), "utf8")).map(
    (l) => l.locale,
  );
  const targets = process.argv.slice(2);
  const locales = targets.length ? targets : allLocales;
  console.log(`Generating fortunes for ${locales.length} locale(s)…`);
  let failed = false;
  for (const locale of locales) {
    if (!existsSync(join(SEED_DIR, `${locale}.json`))) {
      console.error(`  ✗ ${locale}: missing seed file`);
      failed = true;
      continue;
    }
    try {
      generateLocale(locale);
    } catch (err) {
      console.error(`  ✗ ${locale}: ${err.message}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("Done.");
}

if (process.argv[1] && process.argv[1].endsWith("generate-fortunes.mjs")) {
  main();
}

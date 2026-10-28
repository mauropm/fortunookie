#!/usr/bin/env node
// Fortune content validator.
//
// Verifies every locale in locales.json has ≥ MIN_FORTUNES unique, valid,
// positive fortunes in public/fortunes/<locale>.json. Exits non-zero on any
// failure. Writes content-report.json (machine-readable) and
// docs/CONTENT_REPORT.md (human-readable).
//
// Usage: node scripts/validate-fortunes.mjs [--near-dup-threshold=0.85]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  OUT_DIR,
  CATEGORIES,
  MIN_FORTUNES,
  normalizeText,
  signature,
  jaccard,
  loadGenerated,
  loadTerms,
  termMatcher,
  hasUnicodeProblems,
} from "./lib/content.mjs";

const NEAR_DUP_FLAG_RATIO_FAIL = 0.02; // > 2% near-dup pairs flags the locale
const MIN_LEN = 5;
const MAX_LEN = 400;

function validateLocale(locale) {
  const result = {
    locale,
    ok: true,
    count: 0,
    exactDuplicates: [],
    nearDuplicates: [],
    tooShort: [],
    tooLong: [],
    unicodeIssues: [],
    negativeHits: [],
    invalidCategory: 0,
    missing: false,
  };

  const data = loadGenerated(locale);
  if (!data || !Array.isArray(data.fortunes)) {
    result.missing = true;
    result.ok = false;
    return result;
  }
  const fortunes = data.fortunes;
  result.count = fortunes.length;

  const ids = new Set();
  const textsToIdx = new Map(); // normalized text → first index
  const sigs = new Map(); // index → signature set

  const matchers = loadTerms(locale).map(termMatcher).filter(Boolean);

  for (let idx = 0; idx < fortunes.length; idx++) {
    const f = fortunes[idx];
    if (!f || typeof f.id !== "string" || typeof f.t !== "string") {
      result.tooShort.push({ idx, id: f?.id, reason: "malformed record" });
      continue;
    }
    if (ids.has(f.id)) result.exactDuplicates.push({ id: f.id, kind: "id" });
    ids.add(f.id);

    const text = f.t;
    if (CATEGORIES.includes(f.c) === false) result.invalidCategory++;

    const len = [...text].length;
    if (len < MIN_LEN) result.tooShort.push({ id: f.id, len });
    if (len > MAX_LEN) result.tooLong.push({ id: f.id, len });

    const uni = hasUnicodeProblems(text);
    if (uni) result.unicodeIssues.push({ id: f.id, reason: uni });

    for (const m of matchers) {
      const hit = m(text);
      if (hit) {
        result.negativeHits.push({ id: f.id, text });
        break;
      }
    }

    const key = normalizeText(text);
    if (!key) {
      result.tooShort.push({ id: f.id, len: 0, reason: "empty after normalization" });
      continue;
    }
    if (textsToIdx.has(key)) {
      result.exactDuplicates.push({ id: f.id, duplicateOf: fortunes[textsToIdx.get(key)].id });
    } else {
      textsToIdx.set(key, idx);
      sigs.set(idx, signature(text, locale));
    }
  }

  // Near-duplicate detection over unique texts (O(n²) is fine at ~2k).
  const idxs = [...sigs.keys()];
  const flagged = new Set();
  for (let a = 0; a < idxs.length; a++) {
    for (let b = a + 1; b < idxs.length; b++) {
      const ia = idxs[a];
      const ib = idxs[b];
      if (flagged.size > idxs.length * NEAR_DUP_FLAG_RATIO_FAIL * 5) break;
      if (jaccard(sigs.get(ia), sigs.get(ib)) >= nearDupThreshold) {
        flagged.add(ib);
        if (result.nearDuplicates.length < 50) {
          result.nearDuplicates.push({
            id: fortunes[ib].id,
            similarTo: fortunes[ia].id,
          });
        }
      }
    }
  }
  result.nearDuplicateCount = flagged.size;

  const issues =
    result.exactDuplicates.length +
    result.tooShort.length +
    result.tooLong.length +
    result.unicodeIssues.length +
    result.negativeHits.length;

  if (result.count < MIN_FORTUNES) result.ok = false;
  if (issues > 0) result.ok = false;
  if (flagged.size > result.count * NEAR_DUP_FLAG_RATIO_FAIL) result.ok = false;

  return result;
}

const args = process.argv.slice(2);
const nearArg = args.find((a) => a.startsWith("--near-dup-threshold="));
const nearDupThreshold = nearArg ? Number(nearArg.split("=")[1]) : 0.85;

const locales = JSON.parse(readFileSync(join(ROOT, "locales.json"), "utf8")).map((l) => l.locale);
const results = locales.map(validateLocale);

const report = {
  generatedBy: "scripts/validate-fortunes.mjs",
  minFortunesPerLocale: MIN_FORTUNES,
  nearDupThreshold,
  totalRecords: results.reduce((s, r) => s + r.count, 0),
  allPassed: results.every((r) => r.ok),
  locales: results,
};

writeFileSync(join(ROOT, "content-report.json"), JSON.stringify(report, null, 2) + "\n");

// Human-readable summary.
let md = `# Fortune Content Report\n\n`;
md += `| Locale | Records | Unique | Exact dupes | Near dupes | Too long | Unicode | Negative hits | Status |\n`;
md += `|---|---|---|---|---|---|---|---|---|\n`;
for (const r of results) {
  md += `| ${r.locale} | ${r.missing ? "MISSING" : r.count} | ${r.count - r.exactDuplicates.length} | ${r.exactDuplicates.length} | ${r.nearDuplicateCount ?? 0} | ${r.tooLong.length} | ${r.unicodeIssues.length} | ${r.negativeHits.length} | ${r.ok ? "✅" : "❌"} |\n`;
}
md += `\n**Total records: ${report.totalRecords}** — ${report.allPassed ? "ALL LOCALES PASS ✅" : "VALIDATION FAILED ❌"}\n`;
writeFileSync(join(ROOT, "docs", "CONTENT_REPORT.md"), md);

console.log(md.split("\n").slice(0, 36).join("\n"));

if (!report.allPassed) {
  console.error("\n❌ Content validation FAILED. See content-report.json for details.");
  process.exit(1);
}
console.log("\n✅ All locales pass validation.");

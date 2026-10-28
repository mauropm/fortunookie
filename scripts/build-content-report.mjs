#!/usr/bin/env node
// Human-readable content summary: seed pool sizes + generated record counts.
// Usage: node scripts/build-content-report.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadSeed, loadGenerated, MIN_FORTUNES } from "./lib/content.mjs";

const locales = JSON.parse(readFileSync(join(ROOT, "locales.json"), "utf8"));

let md = `# Content Sources & Counts\n\n`;
md += `Seed pools (authored) → generated fortune library per locale.\n\n`;
md += `| Locale | core | openings | themes | closings | generated | ≥${MIN_FORTUNES}? |\n`;
md += `|---|---|---|---|---|---|---|\n`;
let total = 0;
let pass = true;
for (const { locale } of locales) {
  const seed = loadSeed(locale);
  const gen = loadGenerated(locale);
  const n = gen?.fortunes?.length ?? 0;
  total += n;
  const ok = n >= MIN_FORTUNES;
  if (!ok) pass = false;
  md += `| ${locale} | ${seed?.core?.length ?? "—"} | ${seed?.openings?.length ?? "—"} | ${seed?.themes?.length ?? "—"} | ${seed?.closings?.length ?? "—"} | ${n} | ${ok ? "✅" : "❌"} |\n`;
}
md += `\n**Total generated records: ${total}** — ${pass ? "all locales meet the minimum ✅" : "some locales are below minimum ❌"}\n`;

console.log(md);
writeFileSync(join(ROOT, "docs", "CONTENT_SOURCES.md"), md);
if (!pass) process.exit(1);

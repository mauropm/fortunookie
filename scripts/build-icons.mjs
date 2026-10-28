#!/usr/bin/env node
// Renders PNG assets (OG image, apple-touch-icon) from the SVG sources so the
// repo can ship static raster icons without external services.
// Usage: node scripts/build-icons.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { ROOT } from "./lib/content.mjs";

const OUT = join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

function render(svgPath, outPath, width) {
  const svg = readFileSync(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    loadSystemFonts: true,
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`  ✓ ${outPath}`);
}

render(join(ROOT, "scripts", "og.svg"), join(OUT, "og.png"), 1200);
render(join(OUT, "favicon.svg"), join(OUT, "apple-touch-icon.png"), 180);
console.log("Icons generated.");

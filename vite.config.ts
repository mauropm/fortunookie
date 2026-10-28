import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Stamps the service worker with a per-build cache version so deploys
// invalidate old caches without manual intervention.
const swVersion: Plugin = {
  name: "sw-version",
  apply: "build",
  closeBundle() {
    const file = join(process.cwd(), "dist", "sw.js");
    try {
      const src = readFileSync(file, "utf8");
      writeFileSync(file, src.replace("PLACEHOLDER_BUILD_ID", `b-${Date.now().toString(36)}`));
    } catch {
      /* sw missing — nothing to stamp */
    }
  },
};

export default defineConfig({
  plugins: [react(), swVersion],
  build: {
    target: "es2018",
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});

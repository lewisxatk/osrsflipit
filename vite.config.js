import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rm, cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "site");

// OSRSHub is deployed as a normal Cloudflare Worker with Worker Assets.
// It is NOT a Pages Advanced Mode project. Build into a clean directory that
// Cloudflare/Wrangler never shares with the legacy Pages _worker.js convention.
function cleanWorkerAssets() {
  return {
    name: "clean-worker-assets",
    async buildStart() {
      await rm(SITE_DIR, { recursive: true, force: true });
    },
    async closeBundle() {
      await rm(resolve(SITE_DIR, "_worker.js"), { force: true });
      await mkdir(resolve(SITE_DIR, "assets"), { recursive: true });
      await cp(resolve(process.cwd(), "favicon.svg"), resolve(SITE_DIR, "favicon.svg"));
      await writeFile(resolve(SITE_DIR, ".assetsignore"), "_worker.js\n", "utf8");
      await rm(resolve(process.cwd(), "dist"), { recursive: true, force: true });
      await writeFile(resolve(SITE_DIR, "_osrshub_build.txt"), "OSRSHUB-0.43.0-WORKER-SITE\n", "utf8");
    }
  };
}

export default defineConfig({
  // Do not copy any legacy public/ directory.
  publicDir: false,
  build: {
    outDir: "site",
    emptyOutDir: true,
    sourcemap: false
  },
  plugins: [react(), cleanWorkerAssets()]
});

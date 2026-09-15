import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

// This project is deployed as a normal Cloudflare Worker, not Pages Advanced Mode.
// Never allow a legacy Pages _worker.js file to leak into dist/assets.
function removeLegacyPagesWorker() {
  return {
    name: "remove-legacy-pages-worker",
    async closeBundle() {
      await rm(resolve(process.cwd(), "dist", "_worker.js"), { force: true });
    }
  };
}

export default defineConfig({
  plugins: [react(), removeLegacyPagesWorker()]
});

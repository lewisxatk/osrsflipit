# OSRS Hub — GitHub upload, local checks and safe release guide

This guide applies to the current R2 working package. It is deliberately conservative: this package is not the completed 390-point roadmap and must not replace the known-good production version until all release gates pass.

## 1. What belongs in the GitHub repository

Upload the **contents of the project root**, not a ZIP nested inside the repository. Keep these project-owned files and folders:

- `src/` — React UI and CSS.
- `worker.js`, `wrangler.jsonc`, `vite.config.js`, `package.json`, `index.html`.
- `migrations/` — all existing SQL migrations in order; do not delete or rename applied migrations.
- `tests/` — automated regression tests.
- `README.md`, `DATA_PLATFORM.md`, `MASTER-ROADMAP-390-TRACKER.md`, release notes and tutorial/check files.
- Existing `.bat` safety/build scripts, `.gitignore`, `_redirects`, `robots.txt`, `sitemap.xml`, and `favicon.svg`.

Do **not** remove the existing Discord-related Worker code, Discord configuration variables, any of the existing numbered `.bat` scripts, or old migrations. Do not upload this ZIP as a file inside the repo.

## 2. What must not be uploaded

- `.env`, `.dev.vars`, API tokens, Discord bot tokens, client secrets, private keys, session secrets or any other credentials.
- `node_modules/`, `.wrangler/`, `.git/`, operating-system metadata, editor temporary files, logs, or caches.
- A generated `dist/` or `site/` directory unless your current deployment workflow explicitly requires committed build output. This project's Vite output directory is configured separately; check `vite.config.js` before changing it.
- A second copy of the same project nested inside the repository, or a second copy of the ZIP.

Review `.gitignore` before staging files. Never paste a secret into `wrangler.jsonc`; use Cloudflare Worker secrets for private credentials. The public Discord client ID and redirect URI are configuration values in the current file; **do not change Discord integration as part of this roadmap tranche**.

## 3. Safe local check sequence (Windows)

1. Extract this package to a new folder. Keep the currently deployed/known-good project untouched.
2. Install a supported Node.js LTS release and reopen Command Prompt.
3. From the folder containing `package.json`, run:

   ```bat
   node --check worker.js
   npm run test:worker
   npm install --no-audit --no-fund
   npm run build
   ```

4. If any command fails, stop and save the complete error output. Do not deploy to work around a failed build.
5. `npm run build` must pass before GitHub/Cloudflare release. A successful Worker syntax check does not prove the JSX bundle compiles.

`03-LOCAL-BUILD-CHECK.bat`, `04-MASTER-RELEASE-CHECKS.bat`, `05-MASTER-TRANCHE-CHECKS.bat` and `06-R2-TESTS.bat` are local checks. The emergency-stop and resume scripts change the remote D1 pause flag. `D1-SAFE-UPDATE.bat` can apply migrations and deploy remotely: do not run it casually or as a substitute for review.

## 4. D1 budget and migrations

- The Worker-side daily safety ceiling is now **25,000 estimated row writes/day**. This is an internal guardrail, not a guarantee that Cloudflare's billed/recorded metric equals the estimate.
- The scheduled site-wide market collection gate is now 30 minutes. Live price reads remain on the existing Wiki price API; the change reduces background writes and preserves more headroom for hourly history.
- Target the previous observed usage where practical (about 14,000/day as reported by the project owner) and treat 25,000 actual rows/day as the conservative target ceiling. Cloudflare Dashboard → D1 → `osrshub-accounts` → Metrics is authoritative.
- Do not apply all SQL files blindly to an existing database. Use `npx wrangler d1 migrations list osrshub-accounts --remote` first and inspect which migrations are pending. Never delete/recreate the database to resolve a migration issue.
- The R2 movement endpoint and its new input validation require no schema migration. Existing migration `0006_overnight_price_history.sql` creates the hourly-history table for deployments that have not applied it yet. Existing migrations were left unchanged in this tranche; the current daily ceiling and 30-minute cadence are enforced in `worker.js`.

## 5. Release gates still required

- `node --check worker.js` passes.
- `npm run test:worker` passes.
- `npm run build` passes with dependencies installed.
- Live `/api/data/health` and `/api/data/movement?window=24h` and `?window=7d` work against the intended D1 database.
- Actual Cloudflare D1 Rows written is checked after release and stays within the agreed budget.
- Desktop and iPhone Safari smoke tests cover Market, Movers, item analytics, account/login, alerts and watchlists.
- Discord test notification and a real item alert are checked as regression tests. Discord code is frozen; do not change it to fix unrelated issues.

## 6. Honest status of this package

The Worker syntax check and all four current Node tests passed in the working environment. Dependency installation timed out here, so the full Vite production build has **not** been verified. Live Cloudflare/D1 usage, deployed endpoints, Discord delivery, and desktop/iPhone browser checks have also not been run. This is therefore a working candidate, not a production-approved release or a completed 390-point roadmap.

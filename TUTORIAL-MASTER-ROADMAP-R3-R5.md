# OSRS Hub R3–R5 working tranche — usage and release tutorial

This tranche extends the existing site; it does not create a native mobile app. The visual changes are intentionally compact and use the existing theme system.

## New features

### OSRS Brain catalogue search
Open **Tools → Intelligence workspace** (the existing Intelligence Lab). Search for at least two characters and optionally select an entity type. The panel searches the existing `osrs_catalog` table and displays a short summary where one is stored. If it reports that the catalogue is not ready, inspect `/api/data/health` and the existing ingestion status; the search itself does not trigger ingestion.

### Opportunity Evidence
The Intelligence workspace's evidence panel shows the latest stored history sample count, rough coverage category, event count and cache age for items in the loaded live market set. `good`, `partial`, and `sparse` refer to stored evidence coverage, not fill probability. A missing table/history error is shown rather than replaced with invented data.

### Market/Screener CSV export
Use **Export CSV** in Market or Screener. The export uses the currently available result set and chosen columns. Keep exported CSV files private if they include any account-specific notes you later add; the current export contains market item data only.

### Smart Flip Finder reserve
Open Screener → Smart Flip Finder. Set bankroll and GE slots, then choose the amount to keep unallocated. The default is 20%. Slot sizing is calculated from bankroll after reserve, not the full bankroll. Profit estimates are still theoretical and do not guarantee fills.

### Loadout import/export
On Loadout, save a setup, export the current setup and saved build list as JSON, import a previous OSRS Hub loadout JSON, or copy a readable summary. Import accepts only known equipment slots and bounded target/stat values. After import, verify equipment requirements, prices and item data; the export is a portable setup, not proof that every item is equippable by the current account.

## API routes added
- `GET /api/data/knowledge?q=<2+ chars>&type=<optional>&limit=<optional>` — read-only catalogue search; result limit capped at 20.
- `GET /api/data/opportunity-evidence` — read-only stored market evidence for the last seven days.

Both use existing D1 tables. No migration is required. They do not run the ingestion process or deliberately write rows. The endpoint may return an unavailable response if the database schema/history is incomplete.

## Files added or changed
- `worker.js` — adds the two read-only API routes. Discord/auth section intentionally untouched.
- `src/main.jsx` — new Intelligence panels, CSV exports, bankroll reserve, loadout import/export and saved-build sync key.
- `src/upgrade.css` — compact responsive styling for new panels.
- `tests/roadmap-next-stages.test.mjs` — tests for the new API routes.
- `MASTER-ROADMAP-390-TRACKER.md` — current point/tranche status; not a declaration that the whole roadmap is complete.
- `RELEASE-NOTES-MASTER-R3-R5-WORKING.txt` and `BUILD-CHECKS-MASTER-R3-R5.txt` — changes and check status.

## GitHub: include and exclude
Upload the project folder's contents, including source, tests, docs, migrations, config, existing BAT scripts, and the new tranche docs. Do not upload the ZIP inside the repository. Do not add `.env`, `.dev.vars`, credentials, Discord client secrets, session secrets, `node_modules/`, `.wrangler/`, `.git/`, caches or generated build output unless your established deployment setup explicitly requires it. Existing BAT scripts are preserved; do not remove them.

## Safe local verification (Windows)
From the folder containing `package.json`, run:

```bat
node --check worker.js
npm run test:worker
npm install --no-audit --no-fund
npm run build
```

Stop if installation or build fails; do not deploy to work around an error. This environment passed Worker syntax and all eight tests, but dependency installation timed out, so the Vite production build is not yet verified.

## Before deploying
1. Keep the currently deployed/known-good repo as a backup and compare the changed files before replacing it.
2. Run the checks above locally.
3. Confirm pending migrations with `npx wrangler d1 migrations list osrshub-accounts --remote`; this tranche has no new migration, and existing migrations must not be blindly replayed.
4. Deploy only after the local production build passes.
5. Smoke-test `/api/data/health`, `/api/data/knowledge?q=dragon`, and `/api/data/opportunity-evidence` against the intended D1 binding.
6. Check Cloudflare Dashboard → D1 → `osrshub-accounts` → Metrics. The 25,000/day internal estimate is not authoritative usage telemetry; compare actual Rows written with the preferred 14,000/day and ceiling of 25,000–30,000/day.
7. Test desktop and iPhone layouts, CSV downloads, loadout JSON round-trip, account sync and both Discord test notification and real item alert. Discord code was not changed, but it still needs regression testing after any release.

**Release status: working candidate, not production-approved.**

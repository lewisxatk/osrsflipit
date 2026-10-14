# V100 master-candidate tutorial

## 1. Keep the test isolated
1. Extract this ZIP into a new folder. Do not overwrite V57 or your live GitHub branch.
2. Create a separate GitHub branch/repository and a separate Cloudflare test Worker/site.
3. Prefer a separate D1 database for testing. Do not run migrations for this candidate; none were added.

## 2. Run the checks
1. Install a supported current Node.js LTS release.
2. Open the extracted project folder in File Explorer.
3. Double-click `04-MASTER-RELEASE-CHECKS.bat`.
4. If `npm ci` fails because no lockfile is present, use `npm install` once in the project folder, then run `npm run build`. Do not deploy if `npm run build` fails.
5. The script also runs `node --check worker.js`.

## 3. What the D1 change does
The market cache still considers up to 150 liquid items every 15 minutes. The SQL now avoids updating an existing `market_current` row when the tracked market/static fields are identical. It preserves price updates when those values change. It does not change the internal 50,000/day budget or the existing ingestion cadence, and no migration is needed.

This should reduce actual rows written when the upstream response repeats values. It does not guarantee an exact number: high price movement, other data jobs, account/auth activity, and retention deletes also affect Cloudflare's D1 metrics. The internal budget is an estimate, not Cloudflare telemetry.

## 4. Test on the separate site
- Open Market; wait for live prices and test item search.
- Open an item detail page and check chart ranges and watchlist actions.
- Open Rising/Falling and compare a few results to the displayed historical window.
- Run Overnight Flip Finder and check that results distinguish historical observations from live-margin fallback estimates.
- Open Loadout, try equipment slots, and test the retry path after any feed error.
- Test themes, watchlists, alerts, navigation, and narrow mobile widths.
- Verify Discord notifications still work without changing Discord configuration; this package intentionally does not modify Discord code.

## 5. Verify D1 usage
After a complete 24-hour period, open Cloudflare Dashboard → D1 → the test database → Metrics and check actual Rows written. Compare with the recent approximately 14k/day baseline. Keep the target below 50k/day. Do not treat `d1Writer.writes` from `/api/data/health` as an actual Cloudflare count.

## 6. Roadmap tracker
Read `MASTER-RELEASE-TRACKER-V100.md`. It records verified work and open test gates. The exact original 390-point text was not present in the V57 ZIP (which contains a 40-item roadmap), so the tracker deliberately does not fabricate missing item descriptions or claim the 390-point scope complete. Restore the original numbered list before doing a reliable per-item reconciliation.

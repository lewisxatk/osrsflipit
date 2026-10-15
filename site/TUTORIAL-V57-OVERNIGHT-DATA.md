# V57 update tutorial — overnight data and database changes

This update starts from OSRS Hub V56.0. It changes the frontend, the Worker data platform, and adds one D1 migration. The existing build-check utilities and Discord/auth handlers are intentionally left unchanged.

## What changed

1. The 24h Rising/Falling view now requests historical time-series observations instead of treating the current buy/sell spread as a day's price movement.
2. Loadout equipment parsing accepts arrays and keyed/nested JSON feeds. If a slot feed fails, the empty failure state no longer blocks a retry or future Auto-build attempt.
3. Item analytics panels and Quick Profit Calculator results use theme-aware surfaces; Recommended Flips rows and Market Weather labels have clearer layout/contrast.
4. The market cache limit increases from 25 to 150 high-volume items per pass, mapping advances by 100 records per pass, and up to 100 high-volume items are sampled once per UK-local hour.
5. The Overnight Monitor uses a new `market_price_history` table to compare average prices at an earlier overnight hour with a later hour and subtract the existing 2% tax model. It is historical analysis, not a fill guarantee.

## Deploying to GitHub + Cloudflare

1. Extract the V57 ZIP and upload the contents to the existing repository root. Upload `src/`, `migrations/`, and all the project source/config/docs. Do not upload the ZIP, `node_modules/`, `.wrangler/`, `.env`, or secrets.
2. Commit and push. Wait for the configured Cloudflare build/deploy to finish.
3. **Apply the new D1 migration once** from a terminal in the project root:

   ```bash
   npx wrangler d1 migrations apply osrshub-accounts --remote
   ```

   This creates `market_price_history`. If you use `D1-SAFE-UPDATE.bat` for manual deployment, it applies pending migrations for you; do not also deploy the same commit manually if GitHub auto-deploy already handled it.
4. Run `02-CHECK-D1-HEALTH.bat` and confirm the DB responds, ingestion is not paused, and the market cache has records. The new history table will start empty immediately after migration.
5. Allow at least **two days of hourly samples** before expecting reliable overnight patterns. The monitor requires repeated samples across at least six of eight overnight hours. More days provide better averages.

## Database rows and write budget

- The V57 Worker internal write governor is set to 50,000 estimated rows/day. This is a guardrail, not Cloudflare's authoritative counter.
- Market cache rows, item-mapping rows, hourly behaviour rows, hourly price-history rows, reference-data rows and retention deletes all contribute differently to actual D1 `rows_written`.
- Check the actual value in Cloudflare Dashboard → D1 → `osrshub-accounts` → Metrics. If the governor blocks a job, check the Worker logs for a `D1 write governor blocked` message before increasing the limit.
- A larger cache does not mean every GE item is stored as a fresh market row every 15 minutes. Live prices still come from the existing price API; D1 holds a bounded high-volume market sample plus progressively ingested item metadata and hourly history.

## Loadout troubleshooting

- Open Loadout and click a gear slot. If the OSRSBox feed is unavailable, the toast should explain the failure; click the slot again after a short wait to retry.
- Auto-build skips items that fail the current stats/slot eligibility checks. A slot with no eligible item should not be interpreted as a valid empty loadout.
- The DPS and kills/hour output remains a simplified estimate, not a tick-accurate simulator. A full combat engine needs deterministic formula tests and verified monster attack/defence data before being described as accurate.

## Limitations to keep in mind

- Historical market averages cannot prove that a buy and sell order would have filled at those exact prices.
- A new history table has no backfilled history; it accumulates prospectively after the migration.
- This package has not been tested against your live Cloudflare account or in a real mobile browser from this environment. Always review the build output and the D1 Metrics after deployment.

# OSRS Hub Master Roadmap — R2 Working Build Tutorial

## Important status
This package advances the 390-point roadmap but is **not yet the final completed 390-point build**. The tracker is the source of truth for what is inherited, implemented, and still awaiting validation.

## What changed in this working build
- The Movers page requests stored OSRS Hub observations for the 24h and 7d windows.
- Mover rows show sample count, coverage, and the evidence quality label for stored-history results.
- If the stored-history endpoint is unavailable or returns no rows, Movers falls back to the existing public timeseries approach.
- The endpoint remains read-only. Its output describes observed prices and does not guarantee trade fills.
- Added two Node built-in tests for movement calculation, 7-day request handling, and no writes.
- The health endpoint marks the app's write counter as an internal estimate, not Cloudflare's authoritative Rows written metric. The Worker-enforced estimate ceiling is now 25,000/day; this is a guardrail, not a promise of exact Cloudflare usage. Site-wide market collection is gated to once per 30 minutes (live prices still use the existing price API) to reserve budget for hourly history.

## Local checks
1. Extract this ZIP to a new folder, separate from the current known-good V100 copy.
2. Install dependencies in that folder using `npm install`.
3. Run `node --check worker.js`.
4. Run `npm run test:worker`.
5. Run `npm run build`.
6. Only continue to GitHub/Cloudflare after all local checks pass.

If `npm install` fails due to network access, the full Vite build has not been verified. Do not treat the syntax check or Worker tests as a substitute for the frontend build.

## Live checks still required
- Verify `/api/data/movement?window=24h` and `/api/data/movement?window=7d` against the deployed D1 database.
- Confirm Movers shows sample counts and coverage for stored-history rows and falls back cleanly if no history exists.
- Check Cloudflare D1 Rows written before and after deployment. The internal app counter is not authoritative.
- Verify daily rows written remains under the 25,000 internal estimate ceiling; aim for the existing ~14,000/day where practical.
- Run the existing Discord smoke tests as regression checks; Discord code was not intentionally changed.
- Check desktop and iPhone layouts and the existing major pages.

## Database migrations
No new migration is required for this R2 change. It reads the existing `market_price_history` and `market_current` tables created by the existing migration set.

## Release safety
- Do not overwrite the known-good V100 ZIP.
- Do not modify existing safety/build BAT files or Discord integration.
- Do not deploy if the production frontend build, live endpoint, or D1 budget check fails.

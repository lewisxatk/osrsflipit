# OSRS Hub V100 master release tracker

## Release rules
- Baseline: V57.0 source ZIP.
- Scope: master release for the previously discussed 390-point roadmap; responsive website included, no separate native mobile app.
- Hard exclusions: do not modify Discord integration/auth handlers or the existing build-check scripts.
- D1 target: preserve the current 150-row market sample / 15-minute sync cadence (about 14,400 attempted market-cache rows per 24 hours before conditional upsert savings), keep the 50,000/day internal safety budget, and verify actual Cloudflare D1 Rows written after deployment.
- Never mark a feature complete based only on adding UI or documentation. Require code review and an appropriate check.

## Current verified work in this package
- [x] V57 source copied as baseline; no live deployment performed.
- [x] Worker JavaScript syntax check (`node --check worker.js`) passes after this release's Worker change.
- [x] Market-cache upsert now skips the conflict UPDATE when all tracked market/static values are unchanged. It intentionally does not compare `last_seen`, so it no longer creates a write solely to refresh that timestamp.
- [x] Existing `MARKET_CURRENT_LIMIT=150`, `DATA_SYNC_MS=900000`, and `D1_SOFT_WRITE_LIMIT=50000` are preserved.
- [x] Existing Worker lines for Discord/auth handlers were not edited by this release patch.
- [x] No database migration added.
- [ ] Full Vite production build: not verified (dependency installation timed out in this environment).
- [ ] Browser/mobile smoke tests: not run.
- [ ] Live Cloudflare Worker / D1 metrics: not run.

## R1–R4 implementation status
- R1 — reliability and regression protection: in progress; this package adds a dedicated verification script and requires the full production build to pass before deploy.
- R2 — market/trading intelligence: in progress; existing historical mover and overnight monitor are carried forward from V57, not counted as newly implemented here. Validate them against live API data.
- R3 — responsive website and usability: in progress; V57 UI is carried forward, and a full mobile regression test remains required.
- R4 — remaining OSRS intelligence/combat/backend roadmap: not yet verified in this package.
- R5–R7 — remaining roadmap stages described in prior planning: not yet verified in this package.

## 390-point register integrity note
The V57 source ZIP contains `ROADMAP-40-IDEAS.txt`, a 40-item list, not the complete original 390-item numbered list. The exact text of the 390-point list was not found among the source ZIP's project files during this pass. To avoid inventing or mislabelling the user's original items, this tracker does not fabricate 390 descriptions or mark unknown items complete. The full original list must be restored from its original conversation/document before a trustworthy item-by-item 390/390 tracker can be produced.

## Next test gates
1. Run `04-MASTER-RELEASE-CHECKS.bat` on Windows.
2. If the Vite build fails, stop; do not deploy. Record the exact error and fix it first.
3. Deploy only to a separate test Worker/site and preferably a separate D1 database.
4. Smoke-test market loading, item detail/chart ranges, rising/falling windows, overnight scan, Loadout equipment/retry, watchlists, alerts, theme and mobile layouts.
5. Check Cloudflare Dashboard → D1 → Metrics after a full 24-hour period. Treat Cloudflare's metric as authoritative; the internal writer counter is only an estimate.
6. Compare actual D1 writes with the previous ~14k/day baseline. Do not increase the cap or ingestion batch sizes without evidence that the write rate remains comfortably under 50k/day.

# OSRS HUB 2.0 — Trading Terminal release

## Scope
This release focuses on the Trading Terminal page only. It does not redesign Loadout Studio or Quest Progression.

## Included
- Single primary item chart, defaults to Twisted Bow when that item exists in the loaded item dataset.
- Item search changes the primary chart and supports adding/removing items in a local watchlist.
- Chart ranges: 24h, 48h, 1 week, 1 month, 6 months, 1 year and all available history.
- Buy-side and sell-side observations from the existing `/api/prices/timeseries` route, with loading/error/retry states.
- Right-side watchlist panel and a market scanner beneath the chart.
- Sortable market columns, item search, members/F2P filter, minimum volume and margin filters.
- Summary metrics are calculated from the loaded market snapshot, rather than hardcoded mockup figures.
- Aurora, Graphite and Light terminal palettes, responsive layouts and reduced-motion support.
- Read-only historical price requests; no D1 schema changes or new D1 write paths.

## Existing integrations
`worker.js`, `wrangler.jsonc`, migration files and Discord implementation were not intentionally modified for this terminal-only change. GE prices remain sourced from the existing API.

## Verification
- `node --check worker.js`: passed.
- `npm test`: 71/71 tests passed after updating terminal regression tests for the new single-chart layout.
- Production Vite build: not verified. Dependency installation timed out in the build environment. Run `npm install` and `npm run build` locally before deployment.

## Install
Back up the existing repository, extract the ZIP, and copy the contents of `OSRSHub-2.0/` into the repository root. Do not upload `node_modules`. Do not run D1 migrations for this release. Review the Cloudflare build log before assuming the live site has updated.


## Build fix (2026-10-19)
Fixed a missing closing parenthesis in the market scanner Flip score bar width expression that caused Vite/esbuild to stop at `src/main.jsx:380`. All 71 Node regression tests pass and `node --check worker.js` passes. Production Vite build could not be rerun in this environment because dependency installation timed out; verify `npm run build` in Cloudflare before relying on the deployment. No Worker, Discord, D1 schema, or migration changes were made.

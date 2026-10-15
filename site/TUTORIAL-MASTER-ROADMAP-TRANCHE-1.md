# Master roadmap tranche 1 — setup and testing

## Scope
This tranche adds a read-only stored-history movement API and clarifies the meaning of the D1 writer counter. It does not change Discord, does not add a migration, and does not replace the existing Movers UI.

## Local checks
1. Install Node.js LTS and npm if not already installed.
2. Open this folder in a terminal.
3. Run `node --check worker.js`.
4. Run `npm install`.
5. Run `npm run build`.
6. If any check fails, do not deploy; retain the error output and return to the last known-good release.

## New endpoint
After deploying the Worker, request:
- `/api/data/movement?window=24h`
- `/api/data/movement?window=7d`

The endpoint returns a list of items with earliest/latest stored hourly prices, start/end timestamps, sample count and a coverage label. It only uses observations already in `market_price_history`, so it cannot report a trend for an item with no stored history. A sparse label means the selected window lacks enough observations; do not treat that result as a strong signal. This is sampled-price movement, not proof of order-book fills.

## D1 monitoring
`/api/data/health` exposes `d1Writer.kind = internal-estimate` and `authoritative = false`. The estimate is useful for the app's soft governor, but it is not Cloudflare's billing metric. Check Cloudflare Dashboard → Workers & Pages → D1 → the production database → Usage, and compare the actual daily Rows written figure over a complete UTC day. Keep the observed value under 50,000/day, with ~14,000/day as the recent baseline to protect where possible.

## Database / migrations
No migration is required for this tranche. Do not run `wrangler d1 migrations apply` for this change.

## Discord and build scripts
Discord/auth handlers and all pre-existing `.bat` build-check scripts are intentionally unchanged. This tutorial does not ask you to change Discord variables, routes, secrets or notification configuration.

## Rollback
Deploy the previous known-good build if the endpoint returns errors or any existing route fails. Because the new endpoint is read-only and has no migration, no database rollback is required.

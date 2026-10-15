# OSRS Hub — Consolidated Market & Tools Update

Responsive OSRS Grand Exchange research, item analytics, flip screening, loadouts, alerts and finance tools.

## Included in this update

- **Market / screener:** retains the existing filter, saved-profile, CSV and responsive item workflows.
- **Trading Terminal:** persists the 24h / 48h / 7d window and pinned charts; includes manual refresh and per-chart retry states.
- **Smart Flip Finder:** remembers bankroll, slot count, reserve, minimum volume, minimum after-tax margin and minimum safety score. It only recommends positive after-tax estimates and opens the full item analytics page.
- **Finance:** allocator excludes non-positive after-tax opportunities and considers safety, liquidity and capital fit. Existing P&L import/export remains available.
- **Market intelligence:** Price Drop Radar ranking modes now use distinct balanced, volume-first and below-alch-value scoring. Market Pulse labels current ROI snapshots accurately rather than claiming price movement without historical evidence.
- **Loadouts:** combat style, target defence/HP and manually entered combat stats persist locally. Saved build import/export remains available.

## Local verification

Requirements: Node.js 20+ and npm. From this folder:

```bash
npm install
npm test
npm run build
npm run preview
```

`npm test` runs the automated Worker and application regression tests. The production build must succeed before deployment. `npm run deploy` publishes to Cloudflare; it is **not** a test command. `npm run db:migrate` applies remote D1 migrations and must not be run for this UI-only update.

## GitHub upload

Upload the project contents to the root of the existing OSRS Hub repository and replace matching files. Keep `src/`, `worker.js`, `migrations/`, `tests/`, `package.json`, `vite.config.js`, `wrangler.jsonc`, `index.html`, `_redirects`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `.gitignore` and the existing safety/build scripts. Do not upload `.env` secrets, tokens, `node_modules/`, `dist/`, `.wrangler/`, `.git/`, logs or credentials.

## Safety / release status

The existing Worker (including Discord integration), six migrations and all existing safety/build scripts are retained unchanged. No database migration or deployment was run. Automated tests and syntax checks are run in the preparation environment; the full Vite production build and real desktop/iPhone browser tests still need to be completed locally before deploying.

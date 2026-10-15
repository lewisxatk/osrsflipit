# OSRS Hub — R8 Stability Update

OSRS Hub is a responsive web app for Old School RuneScape Grand Exchange research, item analytics, flip screening, account planning, loadouts, alerts and trading workflows.

## R8 changes

- Trading Terminal remembers the selected 24h / 48h / 7d history window.
- Saved terminal item IDs are normalised and deduplicated, preventing malformed or duplicate local pins.
- Added a manual history refresh and a per-chart retry action when the public history request fails. Failed requests now show an error state instead of being confused with a valid empty history response.
- Added regression coverage for persistence, pin normalisation and error/retry controls.
- No Discord integration, Worker code, database migrations, scheduled jobs or D1 write settings were changed.

## Local checks

Requirements: Node.js 20+ and npm. From this folder run:

```bash
npm install
npm run test:worker
npm run build
npm run preview
```

These are local checks. `npm run deploy` publishes to Cloudflare and is **not** a test command. `npm run db:migrate` applies remote D1 migrations; do not run it for this UI update.

## GitHub upload

Upload the project files and folders in this ZIP to the root of the existing OSRS Hub repository, replacing matching files when prompted. Keep `src/`, `worker.js`, `migrations/`, `tests/`, `package.json`, `vite.config.js`, `wrangler.jsonc`, `index.html`, `_redirects`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `.gitignore`, and the existing `.bat` safety/build scripts. Do not upload `.env` secrets, tokens, `node_modules/`, `dist/`, `.wrangler/`, `.git/`, logs or credentials.

## Release status

Worker syntax, JSX syntax parsing and the automated Worker/source tests pass in the preparation environment. A full Vite production build and real desktop/iPhone browser test are still required locally before deployment. Do not deploy based only on the syntax checks.

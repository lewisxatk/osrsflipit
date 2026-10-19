# OSRS HUB 2.0

This package is a terminal-focused update to the existing OSRS Hub project.

## Run locally
1. Install Node.js (LTS) and Bun is optional.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm run dev` and open the local URL Vite prints.
5. Run `npm test` for the regression suite and `npm run build` before uploading to GitHub/Cloudflare.

## Install to existing GitHub repository
Back up the repository first, then copy the contents of this folder into the repository root. Do not include `node_modules`. Keep `worker.js`, `wrangler.jsonc`, migrations, and existing environment configuration. This terminal update does not require D1 migrations.

## Trading Terminal
The terminal defaults to Twisted Bow when present in the loaded market dataset, allows item switching, has a right-side watchlist, historical ranges, filters and a sortable opportunity table. Aurora, Graphite and Light palettes are available in the terminal's own theme control. Historical and live prices use the existing GE API; values are not hardcoded to match the mockup.

See `OSRS-HUB-2.0-TRADING-TERMINAL-RELEASE.md` for scope and verification status.

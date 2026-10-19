# OSRS Hub 2.0

This is the OSRS Hub source project for the GitHub repository. It includes the existing React/Vite app, Cloudflare Worker, D1 migrations, market tools, Trading Terminal, Loadout Studio, Quest Pathway and the OSRS knowledge tooling.

## Install and run locally

1. Extract the ZIP.
2. Open a terminal in the folder containing `package.json`.
3. Run `npm install`.
4. Run `npm run dev` to open the local development server.
5. Run `npm test` to run the regression suite.
6. Run `npm run build` before uploading to GitHub or letting Cloudflare build the site.

## GitHub upload
Upload the **contents** of this folder to the root of your existing repository. Do not upload `node_modules`. Keep the repository's `worker.js`, `wrangler.jsonc` and `migrations` directories together with the front-end source.

## Protected existing systems
- Discord/authentication/alerts: existing code retained; not intentionally changed in this visual update.
- GE prices: continue to use the existing price API.
- D1: no new migrations and no new database write paths added in this update. Do not run migrations as part of this release.
- Deployment: this ZIP has not been deployed to Cloudflare.

## Current release validation
`npm test` passes 71 tests. The production build was not verified because dependency installation timed out in the preparation environment. Run `npm install` and `npm run build` locally before deploying.

See `OSRS-HUB-2.0-CHANGELOG.md` for the exact scope and known limitations.

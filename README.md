# OSRSHub V41.3 — Discord Worker deployment

This build is deliberately configured as a standard Cloudflare Worker with Worker Assets. The old Pages Advanced Mode `public/_worker.js` route is not used.

## Important: replace the repository contents
Delete any old `public/` directory from the GitHub repository, especially `public/_worker.js`. Do not keep the old Pages `_worker.js` alongside `worker.js`.

The Vite build also contains a safety cleanup hook that removes `dist/_worker.js` if a stale file is accidentally present, so the Wrangler deploy cannot mistake it for a Pages Worker asset.

## Cloudflare build settings
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker name: `osrsflipit`

## D1
Attach the D1 database to the actual Worker `osrsflipit` with binding name `DB`, or add the D1 binding to `wrangler.jsonc` using the real database ID.

## Discord OAuth
Redirect URI must exactly match:
`https://osrsflipit.prices-app.workers.dev/api/auth/callback`

Required Worker variables/secrets:
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `OSRSHUB_AUTH_SECRET`

Run `migrations/0001_auth.sql` once against the D1 database.

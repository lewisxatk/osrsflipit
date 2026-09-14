# OSRS Hub V41 — Discord Accounts + Cloud Sync

## What changed
- Discord OAuth2 sign-in added to the top-right Login button.
- Cloudflare D1 account storage keyed to the Discord user ID.
- Cloud sync for profiles, filters, column order/widths, analytics tiles, watchlist, alerts/rules, Mini GE, theme, chart preferences, recipe favourites, Finance P&L log, bankroll, portfolio, dashboard pins and saved Calculations account snapshot.
- Historical Margin Scanner upgraded with min/max price, 24h volume, after-tax profit, margin %, minimum observation gap and exact entry/exit times.
- Recipe enchanting data corrected to use the actual jewellery/amulet input items (for example Sapphire ring → Ring of recoil and Dragonstone amulet → Amulet of glory).
- RuneLite import messaging and username extraction made more robust. Important: RuneLite Profiles are primarily plugin/settings profiles, not reliable OSRS account-stat exports; HiScores lookup remains the authoritative account-stat route.
- Screener mobile Profiles panel moved above the table instead of appearing below the market items.
- Desktop/mobile duplicate Profiles panels hidden appropriately so Home does not show the same profile list twice.
- Existing V39/V40 price/tax behaviour retained.

## Discord setup — easiest route

1. Create a Discord application at https://discord.com/developers/applications.
2. Open the application → OAuth2.
3. Add this redirect URL exactly:
   `https://YOUR-DOMAIN/api/auth/callback`
   Replace YOUR-DOMAIN with the real OSRS Hub domain.
4. Copy the Application/Client ID.
5. Reset/copy the Client Secret. Never put this secret in React code or GitHub.
6. In Cloudflare, create a D1 database, for example `osrshub-accounts`.
7. Open the D1 database → Console and run the SQL in `migrations/0001_auth.sql`.
8. In Cloudflare Pages → your project → Settings → Bindings → Add → D1 database binding.
9. Set the variable name to exactly `DB` and select the new D1 database.
10. In Cloudflare Pages → Settings → Environment variables/secrets, add:
    - `DISCORD_CLIENT_ID` = your Discord Application ID
    - `DISCORD_CLIENT_SECRET` = your Discord Client Secret (encrypted secret)
    - `DISCORD_REDIRECT_URI` = `https://YOUR-DOMAIN/api/auth/callback`
    - `OSRSHUB_AUTH_SECRET` = a long random secret (32+ random characters)
11. Redeploy the Pages project.
12. Open the site → Login → Continue with Discord.

Discord's OAuth2 flow redirects the user to the configured callback and returns an authorization code which the backend exchanges server-side. The site requests only the `identify` scope for this login flow. Discord documents the standard OAuth2 flow and redirect configuration in its developer documentation.

## Cloudflare notes

The project currently uses the Pages advanced `_worker.js` route. V41 therefore routes Discord OAuth, session, sync and HiScores through `public/_worker.js`, while the `/functions` versions are retained as standard Pages Function equivalents.

Cloudflare documents that Pages Functions can use D1 bindings and that the binding is available as `env.DB`; the dashboard path is Workers & Pages → project → Settings → Bindings → D1 database binding.

## Security
- Discord client secret is server-side only.
- OAuth state is random and stored in a short-lived HttpOnly cookie.
- Login sessions are signed with HMAC and stored in an HttpOnly, Secure, SameSite cookie.
- SQL writes use prepared statements/bind parameters.
- Cloud sync payloads are capped below 1 MB.
- No Discord bot token or password is stored.
- OSRS Hub does not claim to store data "inside Discord"; Discord is the identity provider and D1 is the account database.

## Build check

The local environment used for this build does not have the Vite dependencies cached and has no reliable package-download access, so a complete `vite build` cannot be truthfully claimed locally. Cloudflare's production `npm run build`/`vite build` remains the authoritative build check.

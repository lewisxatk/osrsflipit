# OSRSHub V46.1 — Full roadmap consolidation

This build consolidates the next roadmap features into the existing pages rather than creating a large number of extra navigation pages.

## Included
- Production/UX polish foundation
- Simplified first-glance charts with advanced options retained
- Personal Discord DM alerts using the signed-in Discord account; no webhook/server required
- Discord alert frequency controls
- Historical opportunity buy/sell pinning in item analytics
- Smart Flip / historical intelligence / market radar foundations in Cool Stuff
- Transparent Flip Score / evidence breakdown
- Watchlist intelligence and liquidity/ROI context
- Item analytics and historical pins
- Flip Simulator
- Finance trading-profile analytics
- Theme persistence locally and through signed-in account sync
- Mobile Profiles/Extras refinements without redesigning the mobile layout
- Aurora/light-mode contrast fixes

## Discord setup
1. Create/configure the Discord application and enable User Install in Discord Developer Portal.
2. Add a bot user to the application and generate a bot token.
3. In Cloudflare Worker Settings → Variables and Secrets, add an encrypted secret named `DISCORD_BOT_TOKEN`.
4. Do not place the token in GitHub, the ZIP, frontend code, or normal variables.
5. Users sign in with Discord, choose **Add OSRS Hub to Discord**, then choose **Connect alerts** on the Alerts page.

The Worker creates the personal DM only after the user explicitly connects, and the site stores the resulting channel ID/frequency with the signed-in OSRSHub account.

## Protected architecture
- Normal Cloudflare Worker + Worker Assets
- `worker.js` retained
- `wrangler.jsonc` retained
- D1 `DB` retained
- `ASSETS` retained
- `/api/*` Worker-first routing retained
- Discord OAuth/session/authentication retained
- No `public/_worker.js`
- No credentials included

## Build note
Worker syntax and source delimiter checks were run. Full Vite production build could not be completed in this environment because `npm install` timed out.

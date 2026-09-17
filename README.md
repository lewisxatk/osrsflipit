# OSRS Hub V47.1 — Reliability & Intelligence Fix

This build is based on the V46.2/V47 project and is intended to fix the features that were previously only partially wired up.

## Included
- 3 saved watchlists, 25 items each, with per-item watchlist picker and active ticker list.
- Watchlists, active list, theme, account, loadout and loadout details included in cloud/export data.
- Screener controls are now in a dedicated toolbar above Market Results; filters, profiles and columns are no longer positioned behind the table.
- Desktop Extras includes Market Spotlight and Loadout.
- Loadout Lab persists equipment details, retrieves OSRSBox slot data, filters equipment by slot, estimates DPS/kills per hour and shows upgrade candidates.
- Account sync uses WikiSync's actual object-shaped `levels` and `quests` response, with HiScores fallback.
- RuneLite profile import no longer pretends a settings profile contains skill/quest progression. If an RSN is present it is synced; otherwise the UI explains why the user must enter the RSN.
- Quest Pathway uses synced unfinished quests plus the existing structured goal requirements and skill-gap planner. WikiSync requires the RuneLite WikiSync plugin to have synced the account.
- Live PVM Model now accepts style, combat stats, weapon speed, max hit, target HP/defence, supply cost and an optional manual kills/hour override.
- Overnight Flip Finder uses the user's local time window and compares the same overnight window across recent hourly observations, with configurable profit, volume, price, ROI and risk thresholds.
- Alert triggers now create a visible top-right toast for 30 seconds and play the configured alert sound.
- Discord live alert delivery now uses the saved Discord channel, retries only when delivery succeeds, and includes an authenticated `Check alerts now` endpoint for troubleshooting.
- Discord OAuth, bot token, D1, Worker Assets, media, SEO, Wrangler vars and the `/media` build fix are preserved.

## Discord secrets
Keep these in Cloudflare as encrypted Worker Secrets only:
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `OSRSHUB_AUTH_SECRET`

Normal variables in `wrangler.jsonc`:
- `DISCORD_CLIENT_ID`
- `DISCORD_REDIRECT_URI`

Never commit secret values to GitHub.

## Important production checks
After uploading to GitHub, Cloudflare should run `npm run build` successfully. The previous `/media` ENOENT closeBundle failure is guarded in `vite.config.js`.

For Discord price alerts, sign in with Discord, connect alerts, send a test, create a price rule, then use **Check alerts now** once a live item price satisfies the rule. The scheduled Worker cron also checks every minute.

## Data-source notes
- OSRSBox provides item/equipment metadata including equipment bonuses and weapon attack speed.
- RuneLite Profiles are settings/plugin profiles, not guaranteed skill/quest exports.
- WikiSync provides RuneLite-synced quest and level data when the account has the WikiSync plugin enabled and synced.
- PVM/DPS and overnight results are models/analysis, not guarantees of kills, fills or profit.

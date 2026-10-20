# OSRS Hub — Loadout Workspace

## Included
- Dedicated `/loadout` route and top-level Loadout navigation entry.
- Generic page intro suppressed on this route so the workspace starts immediately.
- Refreshed light-mode dashboard styling with responsive layout.
- Melee, Ranged and Magic style selectors.
- Budget-driven Auto-build, weapon/armour budget caps, full equipment slots, manual slot picker, slot locks, saved/exported builds and custom item exclusions.
- Username lookup via existing `/api/account` and `/api/hiscores` routes; manual combat-stat overrides remain available and persist locally.
- Incomplete quest records are used to filter equipment when the item catalogue includes quest requirement metadata; manual quest exclusions remain available.
- Estimated DPS/max-hit/accuracy/attack-speed summary and an upgrade path showing GP cost and estimated DPS gain.

## Data quality
The page prioritises the existing OSRS Hub stored equipment catalogue and `/api/itemstats`, with a curated baseline fallback. DPS is still an estimate from available equipment bonuses and attack speed, not a fully validated tick-by-tick OSRS combat simulator. It does not claim every OSRS item or special attack mechanic is fully covered. Prices are from the existing market data and can be missing or stale.

## Safety / scope
`worker.js`, `wrangler.jsonc`, database migrations and Discord integration were not changed. No D1 schema changes or new database writes were introduced by this update.

# OSRSFlipIt v3

React/Vite OSRS Grand Exchange analytics dashboard designed for Cloudflare Pages.

## v3 additions
- Fixed filter Profiles crash/blank-page behavior and safely migrates malformed old profile data.
- Market + full-screen Screener share the same filters, profiles, column order and watchlist.
- Column menu supports tick/untick and drag reorder, with Reset to restore the basic column set.
- `k`, `m`, and `b` price/filter input parsing: `250k`, `10m`, `2.5b`, and comma-separated numbers work.
- Price columns include Insta buy, Insta sell and small last-update timestamps.
- Live local-time clock in the header.
- Graphs use 5-minute data for 24h, with points visible, denser horizontal/vertical grid, local hover timestamps, relative scaling, wheel zoom, drag-to-pan and mobile pinch zoom.
- Buy/sell chart colours are switched: Buy is red; Sell is black in light mode and white in dark mode.
- Escape closes open item graphs/modals/popovers.
- Watchlist ticker runs under the navigation, pauses on hover, and shows watched-item 24h movement.
- Recipes page with favourites, category filters, live GE price calculations and GP/recipe + estimated GP/hour.
- Money Makers page caches the OSRS Wiki hourly-profit tables for up to 24 hours to avoid repeated requests. It falls back to a local snapshot if the Wiki API is unavailable.
- Analysis page with gainers, losers, volume, margins, ROI, gross/tax-free spread and profit-per-limit cards. Analysis item clicks open a centered graph.
- Existing Market, Movers, Watchlist, Alerts, notifications and dark theme remain.

## API
The app uses the public RuneScape Wiki prices API:
`https://prices.runescape.wiki/api/v1/osrs`

No API key is required. The app fetches `/latest`, `/mapping`, `/1h`, and item `/timeseries` data.

## Cloudflare Pages
If the repository contains this project in a nested `osrsflipit_v3` directory:
- Root directory: `osrsflipit_v3`
- Build command: `npm run build`
- Output directory: `dist`

If the contents of this folder are the repository root, leave Root directory blank.

## Money Makers source
The Money Makers page attempts one OSRS Wiki API fetch only when the locally cached snapshot is older than 24 hours. The source warns that hourly rates are estimates and actual profit varies with GE prices, supply, processing speed and efficiency.

## Accounts
The existing account UI is intentionally a front-end shell. Real Google/Discord/email/mobile authentication and cross-device sync require an auth/database provider such as Supabase plus provider configuration. It should not be implemented by storing passwords or credentials in Cloudflare Pages/localStorage.

## Verification
JSX syntax was checked with TypeScript's parser/checker. A full Vite production build was not completed in this environment because package installation/build tooling timed out.

# OSRS Hub V35.2.1 — Startup + Calculator Fix

## Changes
- Hardened startup so module/runtime failures no longer present as an unexplained white page.
- Added a self-contained boot fallback message and global error visibility.
- Browser favicon now exactly matches the purple→blue OSRS Hub OH mark with white text.
- Retained the V35.2 desktop Quick Profit Calculator beside Notifications.
- Calculator accepts plain GP values and k/m/b shorthand, quantity, GE tax, per-item profit, total profit, investment, sale value and ROI.

## Build
`npm install`
`npm run build`
`npm run preview`

## Deployment
Use the V35.2.1 ZIP as a fresh Cloudflare Pages deployment/build. If an old Cloudflare deployment is cached, trigger a new deployment and hard refresh.

## Verification
- ZIP integrity: passed.
- Static JSX/source checks: passed.
- Full Vite production build: not executable in this offline environment because npm dependencies are not cached.


## V36 updates
- Dark-mode parity fixes for Screener and full Item Analytics, with brighter profit-green in dark mode.
- Item Analytics title no longer sticks while scrolling.
- Recipe cards show skill requirements more clearly and include expanded Magic enchanting and Herblore unfinished-potion methods.
- Recipes remain sorted by highest estimated GP/hour by default.
- Finance Flip Log item picker uses the shared searchable suggestion menu and is no longer clipped/sticky.
- Added optional **Full GE Limit Cost** column/filter: buy price × GE limit. It is opt-in and not part of the default columns.
- Added mobile/tablet sort controls for Volume, Margin, Potential Profit, ROI, Flip Score and Limit Cost.
- Added real browser paths: `/dashboard`, `/screener`, `/analysis`, `/recipes`, `/finance`, `/calculators`, `/money-makers`, `/movers`, `/watchlist`, `/alerts`, `/cool-stuff`.
- Added Cloudflare Pages SPA fallback via `_redirects`.

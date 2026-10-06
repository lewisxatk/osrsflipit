# V48.4 — Mobile / Theme / Tools / Stability Fixes

- Fixed watchlist star interactions and persisted watchlist mutations.
- Renamed Cool Stuff UI to Tools while preserving the old /cool-stuff route.
- Fixed expanded Flip Map / Market Constellation viewport behaviour.
- Fixed recipe cards/modal interaction and dark-theme recipe surfaces.
- Fixed dark/aurora/void chart tooltip contrast.
- Hardened dark-theme market/screener metrics, profiles and columns controls.
- Improved mobile screener controls and interactive card semantics.
- Hardened Loadout picker inputs and added live-market search fallback while OSRSBox slot data loads.
- Kept Discord OAuth/alerts/backend intact.

# OSRS Hub — V48.3 Mobile + Theme + UX Pass

## What changed
- Compact iPhone header: `OH+` brand, always-visible global item search, compact theme control, cleaner one-line layout. Landscape gets an even tighter header.
- Mobile chart gestures: chart now owns touch gestures so one-finger graph dragging no longer scrolls the page; pinch zoom remains supported.
- Watchlist picker is portalled to the document body, so Screener tiles/cards cannot cover it on mobile or desktop.
- Void theme hardening across Market, Screener, ticker/watchlist, Cool Stuff, Finance, Dashboard, Calculations and other legacy surfaces. Dark/Aurora Cool Stuff surfaces are also normalised.
- Flip Map and Market Constellation now have an expand/full-screen viewing mode.
- Overnight Flip Finder reworked around a compact decision summary first, with detailed filters hidden behind “Adjust filters”.
- General mobile overflow, touch, stacking and visual-surface optimisations.

## Preserved
- Discord authentication, Discord alert checks/cron and Cloudflare Worker backend.
- Existing auth/D1 configuration and API proxy.
- Existing media assets and branding are optional in the build; the project still builds if the media folder is absent.

## Build
- Version: `0.48.3`
- Build stamp: `OSRSHUB-0.48.3-WORKER-SITE`
- Vite output remains `site/` for Cloudflare Worker Assets.

## ZIP packaging
The V48.3 source ZIP intentionally omits the optional `media/` folder to keep repeated source archives smaller. The build system still copies `media/` into `site/` when it exists, so a normal GitHub checkout containing the media folder keeps the branding assets.


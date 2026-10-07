# V51 Experimental Mega Build

This is an isolated experimental rebuild of OSRS Hub V50. It keeps the existing Discord/OAuth/D1 Worker integration intact and adds a large client-side intelligence and motion layer for testing.

## V51 experimental feature set
- Merged Analysis + Market Spotlight workspace; `/analysis` is canonical and legacy Spotlight/Movers paths resolve there.
- Watchlist intelligence: added-at age, price change since added, margin/ROI/volume, risk, GE limit, fill confidence and capital-efficiency context.
- Fixed watchlist star ID normalisation so numeric/string item IDs cannot silently prevent adds/removals.
- Quick-find market search rail beneath the live market header.
- OSRS Hub Intelligence Brain with Market Weather, Opportunity Lifecycle, Fill Probability, Opportunity Decay, True Flip Value, Capital Turnover, Profit/1m, GE-slot allocation, Personal Flip Brain, For You, Session Planner, What-Should-I-Do, Daily Report, Overnight Intelligence and Smart Notification definitions.
- Real GP/hour scenario engine with conservative/balanced/aggressive modes.
- Boss Profit Simulator with editable loot, kills/hour and supply costs plus presets.
- What-if account/economic planner, upgrade ROI view and training/economic planning layer.
- Volume Surge, Liquidity Freeze and Anomaly Detector views.
- Hub Score, achievements, personal presets, Market Missions and benchmark/leaderboard concepts.
- Data Platform coverage panel for GE, history, account, loadout, recipes, PVM and local trade data.
- New restrained floating/bubbly motion system, breathing surfaces, tactile controls and mobile responsive intelligence cards.
- `prefers-reduced-motion` support.

## Discord safety
`worker.js`, Discord OAuth routes, Discord alert routes, cron handling, D1 bindings and Discord-related Worker configuration are intentionally preserved from the supplied V50 ZIP. This experimental build does not modify the Discord backend.

## Build note
The sandbox successfully parser-checked `src/main.jsx` with TypeScript's JSX parser. A full Vite build could not be completed locally because dependency installation timed out; the normal `npm install` + `npm run build` should still be run in GitHub/Cloudflare before deployment.

# V50.0 — Watchlist Intelligence + Analysis Consolidation

V50 is a focused production hardening pass built from the clean V49 source.

## V50 fixes and upgrades
- Fixed watchlist star interaction so it does not submit/navigate/refresh the page and reliably toggles the selected watchlist.
- Watchlist metadata now records when an item was added plus its entry buy/sell snapshot.
- Watchlist 2.0 adds: time since added, current buy/sell, GP and percentage change since added, current margin, ROI, 24h volume, Flip Score, risk and GE limit.
- Added `osrshub-watch-meta` to the cloud/local settings whitelist so Watchlist 2.0 survives signed-in sync.
- Consolidated Market Analysis + Market Spotlight into the single Analysis workspace. `/spotlight` and `/movers` remain compatibility aliases and open Analysis; there is no separate Spotlight page/menu item.
- Theme selection is written to both legacy and Hub theme keys on every change, keeping the selected theme through refreshes and ready for account sync.
- Hardened Void theme surfaces, buttons, chart tooltip, Money Makers modal and secondary controls against legacy white/light leaks.
- Fixed mobile ticker/search stacking so the scrolling watchlist cannot sit over the vertical Market search field.
- Hardened Loadout picker rendering: asynchronous slot loading, bounded equipment caches, bounded suggestion rendering, constrained mobile modal/list heights and reduced layout pressure.
- Dashboard now exposes a visible Sign in action on mobile and desktop when signed out; signed-in state is shown directly in the Dashboard.
- Removed the duplicated “Why this score?” block; Item DNA remains the single intelligence explanation surface.
- Hardened Money Makers and existing Recipe modal/card interactions with explicit modal sizing, overflow and theme surfaces.
- Discord/OAuth/D1 Worker code remains intact.

## V50 future pathway
### V50.1 — Watchlist Intelligence
- Per-watchlist “added vs now” sparklines.
- Best/worst performer since added.
- Biggest mover today vs since-added baseline.
- Watchlist health score: liquidity, margin quality, volatility and capital concentration.
- “Still worth holding?” signal with transparent reasons.

### V50.5 — OSRS Data Engine
Build a first-party normalized OSRS data layer rather than repeatedly querying unrelated pages from UI components. Store source records, timestamps, provenance, versioning and normalized entities in one internal model.

Planned domains:
- GE prices, volumes, limits, tax and historical time series.
- Items, equipment bonuses, requirements and slots.
- Monsters, bosses, combat stats, mechanics, weaknesses and loot tables.
- Skills, XP tables, training methods and output rates.
- Quests, requirements, rewards and progression routes.
- Activities, locations, travel assumptions and banking routes.
- Money-making methods with inputs, outputs, costs, cycle time and confidence.
- RuneLite/account imports and user-specific stats/loadouts.

### V51 — Combat + GP/hour engine
A real combat model should calculate DPS and kills/hour from account stats + equipment + target + mechanics, then join that to live loot/supply prices to produce a transparent GP/hour range.

The target pipeline is:
`Account → Loadout → Combat formulas → DPS → Kill time → Loot model → Supply cost → GP/hour → Confidence range`

This should support boss/monster presets, custom targets, different weapons/styles, special attacks, food/prayer usage and loot assumptions instead of relying on static GP/hour numbers.

### V52 — OSRS Hub as the data source
Once normalized data is stable, the UI should stop being a collection of external-page readers. Source adapters update the Hub data layer, while every feature reads the same normalized records. This gives consistent numbers across Screener, Analysis, Loadout, Money Makers, Calculations and Finance.

## Unique future ideas
- **Market Regime:** Calm / trending / volatile / spread-compressed market states.
- **Flip DNA:** learn which item characteristics match a user's successful flips.
- **Fill Probability:** estimate how realistic a quoted margin is based on volume, spread and recent price movement.
- **Opportunity Decay:** show how quickly a flip has been disappearing since detection.
- **Capital Heatmap:** show where every 1m of bankroll would currently work hardest.
- **Flip Replay:** replay the exact market conditions around a historical opportunity.
- **Boss Profit Simulator:** choose boss, gear, kill speed and loot assumptions to model expected GP/hour and variance.
- **Session Planner:** “I have 20m and 60 minutes” → allocate flips, bossing or skilling methods.
- **Explain Everything:** every major number gets a compact “inputs → formula → result” explanation.
- **Confidence bands:** GP/hour and flip estimates display expected / conservative / optimistic ranges rather than one misleading number.

## Animation direction
Animations should remain useful rather than decorative:
- Watchlist star: short orbit/pop animation when an item is saved.
- Price changes: subtle number roll + directional pulse, not full-card flashing.
- Analysis signal cards: tiny live pulse on newly detected opportunities.
- Market Map: dots gently breathe when their score changes; selected item locks with a halo.
- Loadout: equipment slot swap animation with a quick stat-delta reveal.
- Dashboard: P&L counters roll into place when the period changes.
- Watchlist 2.0: since-added gain/loss bar grows from zero on first view.
- Theme changes: short crossfade instead of a hard visual snap.

## Validation
- TypeScript JSX parser: PASS.
- Worker JavaScript syntax check: PASS.
- Parenthesis/brace/bracket balance: PASS.
- Media folder: intentionally excluded from the source ZIP.
- Full local Vite build: not claimed; dependency installation timed out in this environment. Cloudflare/Bun remains the target build environment.


---

## Historical build notes

# V49.0 — Clean Production Rebuild

V49.0 is a clean, flat source rebuild from the V48.4.1 line. It keeps the existing OSRS Hub functionality, authentication/Discord backend, mobile/theme work and Tools consolidation while fixing the Recipes JSX parser failure with a fully reformatted `Recipes` component.

## V49.0 build integrity
- `src/main.jsx` passes the TypeScript JSX parser check.
- Recipes card JSX is explicitly structured with balanced elements and a safe `.map()` callback.
- Root archive contains only the project source; no nested `fix484/` or other staging folder.
- Optional `media/` folder is intentionally excluded from this update ZIP.
- Discord/auth worker code and D1 migration are preserved.
- No secrets are added to the repository.

## Deployment
Use the files at the repository root. Cloudflare Pages/Workers should run `npm run build`. The repository's Cloudflare environment can continue using Bun for dependency installation.

# V48.4.1 — Production Build Syntax Hotfix

- Fixed the Recipes JSX syntax error in the recipe card map.
- The V48.4 build failed at `src/main.jsx:617` because the recipe card closing `</div>` was missing before the `.map()` close.
- Preserved the V48.4 mobile/theme/Tools changes.
- Media folder intentionally excluded from this source ZIP.
- Discord/auth/worker configuration preserved.

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



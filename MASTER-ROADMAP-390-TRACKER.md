# OSRS Hub — 390-point roadmap tracker

Last updated: 2026-10-14
Baseline: V100 candidate (derived from V57 source)
Working build: R2 movement + multi-graph comparison (not the completed 390-point release)

This tracker is deliberately honest: a roadmap entry is not complete merely because it was discussed, documented, or existed in an earlier build. The complete numbered scope is in the user's approved “OSRS Hub: the ultimate upgrade roadmap” message in the conversation.

## Status definitions
- **Existing / inherited** — some implementation was already present in the baseline; not a new addition in this release and still needs feature-specific regression tests.
- **Implemented in this tranche** — code added in this release; syntax-checked, but not automatically considered live-tested.
- **Needs implementation** — not yet delivered or insufficient evidence exists to mark it done.
- **Needs validation** — code exists but needs production build, D1/live API, browser, or game-mechanics verification.

## Current tranche status

| Roadmap points | Area | Status | Notes |
|---|---|---|---|
| 1–10 | Shared data platform, write ledger, history, recovery, item data, health, migrations, release gate, shared calculations, provenance | Partial / needs implementation | Existing data platform and health endpoint inherited; write counter is an internal estimate, not authoritative Cloudflare usage. |
| 11–36 | Market and Screener | Existing / needs validation | Screener, movers and item charting exist in baseline; custom formula builder, reliable coverage labels, exports and other points require individual audits. |
| 37–62 | Smart Flip Finder | Existing / needs implementation | Bankroll and strategy features exist in part; allocation, calibrated confidence, replay and paper trading are not confirmed complete. |
| 63–74 | Overnight intelligence | Existing / needs validation | Overnight analysis exists; its quality depends on history coverage and must not imply guaranteed fills. |
| 75–100 | OSRS Brain | Partial / needs implementation | Several catalog/import foundations exist; a complete source-backed knowledge graph and answer-to-action system are not confirmed. |
| 101–130 | Combat and Loadout | Existing / needs validation | Loadout builder and item-stat lookups exist; full formula coverage and regression validation are not confirmed. |
| 131–150 | Account progression | Partial / needs implementation | Account import and some progression tools exist; import completeness, goal dependency and coaching require more work. |
| 151–172 | Desktop experience | Needs implementation / validation | Existing desktop UI is retained; advanced workspace, docking, shortcuts and other enhancements need audit and delivery. |
| 173–200 | Mobile website | Partial / needs implementation | Responsive layouts exist; the full touch, accessibility, offline/PWA and mobile regression scope is not complete. No separate native app is in scope. |
| 201–216 | Existing-page improvements | Partial / needs implementation | Several tools already exist; every handoff, simulator, error state and completeness check needs validation. |
| 217–268 | Intelligence layer and Opportunity Graph | Partial / needs implementation | Some scoring/signals exist; calibrated forecasts, clusters, outcome learning and the connected graph are not confirmed complete. |
| 269–300 | Backend/data engineering | Partial / needs implementation | Bounded jobs, a soft write budget and retention logic exist; job ledger, backpressure, recovery dashboard, backup exercises and authoritative metrics need work. |
| 301–320 | Alerts and automation | Existing / needs validation | In-app/Discord-related alert foundations exist; Discord is explicitly frozen and must not be changed. Non-Discord alert improvements remain to be audited. |
| 321–340 | Design system | Partial / needs implementation | Theme and styling foundations exist; automated contrast/theme and visual regression coverage remain. |
| 341–355 | Performance and reliability | Needs implementation / validation | No complete measured performance or route-level regression suite is confirmed. |
| 356–368 | Security and privacy | Partial / needs implementation | Server-side auth/data routes exist; full ownership, rate-limit, export/delete, audit and security test coverage remains. |
| 369–390 | Unique features | Needs implementation | Brain chat, simulators, relationship explorer, strategy lab, replay, public links, onboarding and goal-to-recommendation engine need implementation/audit. |

## Current implementation update (R2 working build)

1. Added read-only `GET /api/data/movement?window=24h|7d` to calculate movement from stored hourly observations using the earliest and latest observations inside the selected window.
2. Connected the Movers UI to stored movement for 24h and 7d windows, displaying observation count, coverage, and evidence quality. If the endpoint is unavailable or returns no rows, the existing public-timeseries method remains the fallback.
3. Movement API ordering now prioritizes the largest absolute moves so falling items can appear alongside rising items.
4. The movement response includes start/end prices and timestamps, sample count, elapsed hours, expected samples, coverage percentage and `good` / `partial` / `sparse` quality labels.
5. Added Node built-in tests for 24h movement calculations, 7d requests, and the no-write guarantee. Both tests pass in this environment.
6. `/api/data/health` explicitly labels `d1Writer` as an internal estimate and tells operators to compare it with Cloudflare's authoritative D1 Rows written metric.
7. Added a responsive multi-graph comparison panel to item analytics: four aligned charts for instant-buy price, instant-sell price, after-tax margin and ROI using the selected history range. Each graph has its own scale, tooltip and latest value; sparse data is called out rather than fabricated.
8. Added this tracker and updated release/test instructions.

## Explicitly not claimed complete

- The full 390 points are not complete in this tranche.
- The Movers UI connection has passed source-level syntax validation and mocked endpoint tests, but still needs a production build and live D1/browser regression test.
- Full Vite production build, live Worker/D1 query execution, browser tests and actual Cloudflare write metrics still need validation.
- Discord integration and existing build-check utilities must remain unchanged.

## Tick-off ledger — verified work in the R2 working build

These checkboxes track work that has actually been added and checked. They do **not** mean the full numbered roadmap item or its entire feature area is complete. The original roadmap's individual numbered descriptions are not reproduced in this file, so no exact point number is guessed.

### Implemented in code and source/test checked
- [x] Add read-only `GET /api/data/movement?window=24h|7d` endpoint using stored history.
- [x] Return start/end prices and timestamps, observation count, elapsed hours, expected samples, coverage percentage, and `good` / `partial` / `sparse` evidence labels.
- [x] Connect Movers to the historical movement endpoint for 24h and 7d views.
- [x] Keep the existing public timeseries method as a fallback when historical movement data is unavailable.
- [x] Rank movement results by absolute movement so both upward and downward movers can be surfaced.
- [x] Add automated Worker tests for movement calculations / window handling and the no-write expectation; tests passed in the current environment.
- [x] Label the Worker `d1Writer` figure as an internal estimate and document that Cloudflare D1 Rows written is authoritative.
- [x] Preserve Discord/auth code and existing safety/build BAT scripts unchanged in this tranche.
- [x] Add responsive four-chart item comparison (buy, sell, after-tax margin, ROI) using the existing selected history data, with independent scales and a sparse-history empty state.
- [x] Add mobile single-column layout for the four comparison charts.

### Still open — do not tick as complete yet
- [ ] Full frontend production build (`npm run build`) verified with dependencies installed.
- [ ] Visually verify multi-graph chart rendering, tooltip behaviour and theme colours in desktop/iPhone browsers.
- [ ] Live deployed Worker endpoint tested against real D1 data.
- [ ] Cloudflare D1 Rows written checked after deployment and daily budget confirmed under 50,000.
- [ ] Browser regression on desktop and iPhone, including Movers fallback and loading/error states.
- [ ] Full Discord test notification and real item-alert regression test.
- [ ] Audit and implementation of the remaining roadmap points, phases R1–R7.

### Release gate
**Current state: R2 working build with multi-graph comparison added, not release-approved.** Keep V100 as the known-good baseline until the open checks above pass. No database migration is required for the movement endpoint as currently implemented. Do not change Discord integration or existing safety/build-check BAT scripts.


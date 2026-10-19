# OSRS Hub R41 — Design Foundation

## Scope of this tranche
- Adds a persistent desktop-only OSRS Hub sidebar with links to existing workspaces.
- Keeps the current mobile navigation and mobile layout rules intact.
- Adds restrained page-entry and hover transitions with `prefers-reduced-motion` support.
- Leaves the homepage content and quick item workflow unchanged.
- Preserves the existing two-line price graph, Worker, Discord/auth flows, alert logic, GE feed, database schema, migrations and `.bat` files.
- Adds no database writes and requires no migrations.

## Important
This is a foundation tranche, not a claim that every mockup feature has been fully implemented. The complete Terminal, Screener, Loadout Studio and Quest Pathway redesigns still require page-by-page implementation and browser validation against live market data.

## Validation
- `node --test tests/*.test.mjs`: 67 tests passed.
- A production Vite build was not run because dependencies are not installed in this environment.

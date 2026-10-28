# Combat Engine Adapter — Milestone 2 groundwork

This PR adds a small, dependency-free adapter boundary and Node tests to the Vite website. It is intentionally **not** the real calculator integration yet.

## What it does
- Normalises OSRS Hub account skill names to the combat engine's skill keys.
- Converts UI equipment slot names to the engine's slot keys.
- Requires canonical numeric item IDs instead of trying to calculate from names alone.
- Rejects missing skill levels, unknown styles and targets without canonical NPC IDs.
- Marks the request as `not-connected`; it does not return fake DPS, accuracy or max hit.

## Why this is a separate milestone
The upstream calculator uses typed TypeScript models, a canonical equipment dataset, combat-style/prayer/potion enums, and monster-specific mechanics. A thin UI object cannot safely be passed into `PlayerVsNPCCalc`. The next step is to resolve the engine's canonical records and expose a runtime-compatible calculation module, then test it against the upstream fixtures.

## Verification
Run:
```sh
npm test
npm run build
```

This change does not alter Discord integration, the Worker, Trading Terminal, account storage, or production deployment configuration. It also does not claim the Combat Studio is ready for live DPS testing.

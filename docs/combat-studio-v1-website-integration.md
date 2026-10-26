# Combat Studio V1 website integration — first adapter milestone

## What this change does
- Adds a standalone adapter for the nine V1 JSON artifacts.
- Loads the artifacts from `/data/combat-studio-v1/` by default, with a configurable base URL.
- Checks that each artifact is an array, rows are objects, and the declared identity fields are present and unique.
- Preserves unknown values and distinguishes a missing artifact (`blocked`) from integrity warnings (`review_required`).
- Adds fixture-based tests without requiring production OSRS data or network access.

## Important boundary
This is the first frontend consumer adapter, not the finished Combat Studio UI and not a claim that OSRS formulas, factual records, quest eligibility, or DPS have been validated. It does not yet change navigation or load any new data into the live site. That separation protects existing GE prices, Discord integration, Cloudflare routing, and account/loadout behavior while the real data bundle is staged.

## Where the generated files go
Place the nine generated files from the database repository's `dist/` into the website repository at `public/data/combat-studio-v1/` so Vite serves them at `/data/combat-studio-v1/<filename>`. Do not commit a bundle until its size, licensing/source metadata, and current manifest status have been reviewed. Keep the manifest and its SHA-256 values alongside the staged bundle so the files can be checked against the exact generated version.

Required files:
- `items.json`
- `equipment-stats.json`
- `weapons.json`
- `item-requirements.json`
- `item-combat-profiles.json`
- `monsters-combat.json`
- `quests.json`
- `quest-relationships.json`
- `item-relationships.json`

## Local verification
```bash
npm test
npm run build
```

The adapter tests use controlled fixtures and are not a substitute for the next acceptance step: test against a real, hash-verified bundle, then connect it to the Combat Studio UI behind an explicit loading/error state.

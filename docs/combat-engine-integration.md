# OSRS Hub Combat Engine Integration

## Goal

Reuse the calculation engine from https://github.com/weirdgloop/osrs-dps-calc rather than inventing a second DPS formula. This document defines the integration boundary and acceptance tests before the engine is copied or adapted.

## Licensing and provenance

The upstream repository is GPL-3.0. Any copied or adapted source must retain copyright notices, include the licence, identify modifications, and comply with applicable GPL source-distribution obligations. Keep an upstream commit reference and record the exact files copied or adapted. Do not silently mix upstream source into the proprietary website bundle without reviewing the distribution implications.

## Architecture

1. **Upstream engine layer** — calculation logic and its own reference tests; no OSRS Hub UI assumptions.
2. **OSRS Hub adapter** — maps canonical game-data records to the engine's player/equipment/monster inputs. Missing fields remain unknown; do not fabricate values.
3. **Combat service interface** — a stable input/output contract for Combat Studio. Initially callable locally in tests; later expose through a Worker/service only if bundle size and runtime constraints justify it.
4. **Combat Studio UI** — player/account setup, target selection, equipment slots, result panels, loadout comparison and upgrade analysis.

## Adapter contract (draft)

Inputs:
- account skill levels and boosts;
- equipment item IDs, slot, bonuses, weapon speed/style, ammo compatibility and requirements;
- selected target NPC ID and supported target modifiers;
- prayer/potion/buff configuration when supported by the imported engine;
- optional scenario metadata for reproducible comparisons.

Outputs:
- DPS and expected damage per attack;
- max hit, accuracy / hit chance, attack roll and relevant defence roll where exposed by the engine;
- time-to-kill / damage distribution when supported;
- calculation assumptions, unsupported mechanics, and provenance of each mapped record.

The adapter must report validation errors for incompatible equipment or missing required fields rather than silently substituting a different item or inventing stats.

## Combat Studio redesign

- **Setup:** account profile, target/NPC, combat style, budget, prayers and boosts.
- **Loadout:** compact equipment-slot grid with item search, requirements, ammo compatibility, remove/replace controls and item stats.
- **Results:** DPS, max hit, accuracy and supported time-to-kill, with a clear distinction between calculated values and unavailable metrics.
- **Compare:** side-by-side loadouts with GP cost, DPS difference, percentage improvement and item-by-item differences.
- **Upgrade path:** only recommend a replacement when it is valid for the account and target; show cost, DPS delta and assumptions. If none qualifies, display “No upgrades available for these constraints.”
- **Data confidence:** disclose unknown or unsupported mechanics; never present heuristic gear scores as DPS.
- **Preservation:** leave Discord integration and unrelated Trading Terminal code unchanged.

## Verification gates

1. Run upstream calculator tests without modifications where practical.
2. Create adapter tests for representative melee, ranged and magic scenarios.
3. Reproduce published/reference scenarios with identical inputs and compare engine outputs. Record tolerances and explain rounding differences.
4. Test slot constraints, ammo compatibility, skill requirements, quest locks and incomplete data.
5. Run website tests and production build.
6. Only enable real-DPS labels in Combat Studio after the engine path is wired and the reference tests pass.

## Current status

This is the integration plan and contract only. It is not evidence that the engine has been integrated or that Combat Studio currently calculates verified DPS.

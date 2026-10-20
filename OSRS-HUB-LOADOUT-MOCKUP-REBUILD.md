# OSRS Hub Loadout Studio Mockup Rebuild

- Rebuilt the dedicated Loadout page layout to match the approved light-mode three-column mockup.
- Added workspace tabs for Auto Build, Custom Loadout, Compare, Upgrade Planner, Boss Loadouts, and Saved Setups.
- Reworked account import / stat overrides, budget controls, style selection, quest restrictions, persistent item exclusions, slot locks, recommendations, upgrade rows, full slot breakdown, DPS comparison, combat bonuses, additional tools, and DPS details into the new layout.
- Existing account lookup, item catalogue, equipment picker, auto-build, saved builds, import/export and upgrade scan logic are retained.
- Only `src/main.jsx`, `src/osrshub2.css`, and this release note are changed for this release. Worker, Wrangler configuration, migrations, and Discord integration are unchanged.

## Verification

- `npm test`: 80 passed, 0 failed.
- ZIP integrity check: passed.
- A fresh Vite production build could not be run because dependency installation timed out in the build environment. This release is not claimed to be production-build verified.
- DPS remains the existing simplified estimate model and is labelled as an estimate. This rebuild does not claim to add a fully validated tick-accurate OSRS combat simulator or authoritative item-by-item DPS data.

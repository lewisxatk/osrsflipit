# Combat Studio V2 — engine connection and release checklist

## Website integration already present

The Combat Studio already mounts `src/combat-studio/LiveCombatPanel.jsx`. That panel calls the website-side request builder and client:

- `src/combat-studio/live-calculation-request.js` validates account skills, explicit attack style/stance, canonical item IDs and canonical monster ID.
- `src/combat-studio/live-calculation-client.js` checks `GET /health`, then sends `POST /api/calculate`.
- The runtime URL is read from `VITE_COMBAT_RUNTIME_URL` or the saved Combat Studio runtime setting.
- The UI deliberately shows unavailable/review-required states instead of inventing DPS.

## Why live DPS is not yet switched on

The engine repository contains a separate Cloudflare Worker at `src/osrshub-runtime/worker.ts`. Its deployment is deliberately manual. The engine's deployment guide explicitly requires a dry run, bundle-size review, production-origin configuration and health/calculation smoke tests before connecting the website. No deployed production Worker URL has been confirmed in this change, so this branch does not point the site at a guessed endpoint.

## Safe activation steps

1. In `lewisxatk/osrshub-combat-engine`, run `npx wrangler deploy --dry-run`.
2. Resolve any bundle-size or build issues. Set `ALLOWED_ORIGIN` to the exact live OSRS Hub origin (not the placeholder currently in the engine repo).
3. Deploy the Worker manually with `npx wrangler deploy` only after the dry run and account limits are verified.
4. Smoke-test `/health`, malformed requests, invalid canonical item/monster IDs and a known-good regression scenario.
5. Set `VITE_COMBAT_RUNTIME_URL` in the website build environment to the deployed Worker origin, rebuild, and verify a real calculation and a real loadout comparison.
6. Keep the engine's canonical-record validation and GPL-3.0 notices intact.

## V2 UI change in this branch

The new `src/combat-studio-v2.css` skin is scoped to `.combat-studio`. It changes only Combat Studio's presentation to a dark stone/charcoal and antique-gold RuneScape-inspired theme, with responsive layouts. It does not replace the optimizer, account import, quest gating, saved loadouts or calculation code.

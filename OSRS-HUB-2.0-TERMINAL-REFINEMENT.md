# OSRS Hub 2.0 — Trading Terminal Refinement

## Included
- Removed the large Trading Terminal title/description block so market data starts closer to the global navigation.
- Removed the terminal-only theme switcher. Terminal styling now follows the site's global theme selection.
- Aurora is the default site theme for users without an existing saved theme preference. Existing user-selected theme preferences are preserved.
- Added persisted chart controls for buy/sell series visibility, volume bars, grid visibility, line/area display and tooltip crosshair.
- Added a compact market status strip and tightened card/table spacing toward the supplied trading-terminal mockup.
- Kept the existing GE API endpoints and read-only historical price requests.

## Safety
- No Worker or Discord integration changes.
- No D1 schema or migration changes.
- No new server-side writes. Chart display preferences are stored in browser localStorage.

## Validation
- `node --test tests/*.test.mjs`: 71/71 passed.
- Production Vite build could not be run in the packaging environment because dependency installation timed out. Run `npm install` and `npm run build` locally before uploading to GitHub.

# OSRS Hub 2.0

## Trading Terminal refinement
This release refines the Trading Terminal toward the supplied Aurora mockup. It removes the large page intro, follows the global site theme, and adds user-customisable chart display controls for buy/sell series, volume bars, grid, line/area mode and crosshair.

## Install
1. Back up your existing GitHub repository.
2. Extract this ZIP.
3. Upload the **contents** of the `OSRSHub-2.0` folder into the root of your existing repository.
4. Run `npm install`, `npm test`, and `npm run build` locally.
5. Upload only after the production build succeeds.

Do not run D1 migrations for this release. Discord, authentication, alerts, Worker source and the existing GE API are intended to remain unchanged.

## Validation status
The included automated tests pass (71/71). The production Vite build was not verified in the packaging environment because dependency installation timed out; verify locally before deploying.

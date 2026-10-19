# OSRS Hub R40 — install tutorial

## What this release adds
- Dedicated Loadout Studio route: `/loadout-studio`.
- Dedicated Quest Pathway route: `/quest-pathway`.
- Loadout Studio remains connected to the existing equipment catalogue and setup/upgrade logic.
- Quest Pathway includes a selectable goal and a checklist saved in this browser.
- Desktop Tools menu and mobile More menu expose both workspaces.
- Updated light-mode card styling and restrained transitions, including reduced-motion support.
- Existing Trading Terminal, two-line item graph, market feed, alerts, Discord and authentication are retained.

## Install
1. Download and extract `OSRSHub-R40-WORKSPACES-TRADING-QUEST.zip`.
2. Open the inner `OSRSHub` directory.
3. Upload the contents of that directory to your existing GitHub repository, replacing matching files. Do not upload the ZIP itself as a single repository file.
4. Do not delete existing Cloudflare bindings or secrets.
5. Do not run `D1-SAFE-UPDATE.bat`, `wrangler d1 migrations apply`, or any migration command for this release. There are no database migrations in R40.
6. On Windows, double-click the existing `04-MASTER-RELEASE-CHECKS.bat`. It checks Worker syntax, runs the automated tests and runs the Vite production build. It does not deploy.
7. Only proceed with your normal GitHub/Cloudflare deployment if all checks pass.

## If you prefer commands
Run these from the extracted `OSRSHub` folder in Command Prompt or PowerShell:

```bat
npm install
node --check worker.js
npm test
npm run build
```

No new `.bat` file or separate data-import command is required for R40. This release introduces no new D1 writes and does not change the worker.

## If a check fails
- Copy the first complete error block, not only the final line.
- Do not deploy a failed build.
- Do not run migrations as a workaround.
- Send the error block so it can be diagnosed against this exact release.

## Important feature notes
- Quest Pathway is a new interactive planning workspace with locally stored goal/checklist state. Its quest chain is explicitly provisional; it is not yet a fully validated prerequisite solver. The UI labels that limitation rather than claiming a route is optimal.
- Loadout Studio reuses the existing equipment database and DPS-estimated upgrade scanner. The current DPS model is not a fully tick-accurate combat simulator; verify gear requirements and prices in-game.
- Build/test results from the packaging environment: 67/67 Node tests passed, Worker syntax passed, JSX parser reported 0 syntax diagnostics. A production Vite build could not be completed here because dependency installation timed out. Run the master check locally before deploying.

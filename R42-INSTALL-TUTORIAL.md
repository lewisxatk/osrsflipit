# OSRS Hub R42 — Install Tutorial

1. Download and extract `OSRSHub-R42-FULL-WORKSPACE-VISUAL-PASS.zip`.
2. Open the inner `OSRSHub` folder.
3. Upload its project contents to your existing GitHub repository, replacing matching files. Keep your Cloudflare secrets, bindings, Worker configuration, and Discord settings unchanged.
4. Do **not** run database migrations for R42. No schema changes are included.
5. On Windows, open the project folder and run the existing `04-MASTER-RELEASE-CHECKS.bat`. It expects dependencies to be installed first.
6. If dependencies are not installed, run `npm install` in the project folder, then `npm test` and `npm run build`.
7. Deploy only if all checks pass, using your usual GitHub/Cloudflare process.

No new BAT or CMD files are required. R42 adds no D1 writes and does not modify `worker.js`. Discord, authentication, alerts, GE price ingestion, the simple Home page, current mobile navigation, and the two-line item graph are preserved.

## What to test after deployment
- Desktop: persistent sidebar, active page highlight, Trading Terminal, Screener, Loadout Studio and Quest Pathway.
- Mobile: existing bottom navigation and compact Home/item menu remain usable.
- Check the browser console and Cloudflare logs for any unexpected errors.

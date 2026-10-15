# R6 working tranche — what changed and how to test

## What's included

- `src/main.jsx`: the item detail route and Trading Terminal component/navigation.
- `src/upgrade.css`: standalone item-page layout, graph ordering, terminal cards and phone breakpoints.
- `tests/roadmap-next-stages.test.mjs`: adds a source-level UI regression check alongside existing Worker tests.
- `RELEASE-NOTES-MASTER-R6-ITEM-TERMINAL.txt`: scope and validation limits.
- `BUILD-CHECKS-MASTER-R6.txt`: exact checks run and their status.
- `MASTER-ROADMAP-390-TRACKER.md`: tranche status appended without marking the whole roadmap complete.

## GitHub upload

1. Download and extract the ZIP.
2. Upload the **contents of the single project folder** to your testing branch, not the ZIP file itself.
3. Keep the current production `main` branch unchanged until preview testing passes.
4. Include `src/`, `tests/`, `migrations/`, `worker.js`, `package.json`, `vite.config.js`, `wrangler.jsonc`, `index.html`, `_redirects`, and the project documentation. These are source/configuration files, not generated output.
5. Do not upload `.env` files, Discord client secrets, tokens, `node_modules/`, `.wrangler/`, `.git/`, build output, or local logs. The ZIP does not require a new secret or Discord configuration change.
6. Do not run D1 migrations or `D1-SAFE-UPDATE.bat` for this tranche; no migration was added.

## Test the item page

1. Open the preview site and choose any market item.
2. Use **Open in full page**. The URL should become `/item/<item-id>`.
3. Confirm the main chart and the four-chart comparison sit immediately below the item heading, before the metric tiles and detail cards.
4. Refresh the browser. The same `/item/<item-id>` URL should remain and restore that item's page after the market list loads.
5. Use the page's Back button. If the page was opened from within the app, it should return to the prior page; if the URL was opened directly, closing it returns to Home instead of navigating away from the site.

## Test the Trading Terminal

1. Open **Tools → Trading Terminal** on desktop, or **More → Trading Terminal** on mobile.
2. Search for an item and press **+ Pin**. Pin up to four different items.
3. Confirm each chart loads its own recent buy/sell history. Sparse history should display a message rather than fake data.
4. Refresh the Terminal. Pinned IDs should remain on that device/browser because they are stored in localStorage.
5. Remove a chart or use **Clear workspace**. Test at narrow iPhone width and in landscape.
6. External market references open in a new tab and are not represented as API integrations.

## Checks

Run `npm run test:worker` and `npm run build` in a local Node environment after dependencies are installed. This environment's Worker/source tests passed, but the production Vite build was not verified because dependency installation timed out. Do not promote the preview to production until the build and browser checks pass.

# OSRS Hub R41 — Install Tutorial

1. Download and extract the ZIP.
2. Open the inner `OSRSHub` folder.
3. Upload the project contents to your existing GitHub repository, replacing matching files. Keep Cloudflare secrets and bindings unchanged.
4. Do **not** run database migrations; this update adds no migration.
5. On Windows, run the existing `04-MASTER-RELEASE-CHECKS.bat` after dependencies are installed. It checks syntax, tests and the production build.
6. Deploy through your normal GitHub/Cloudflare process only after all checks pass.

No new BAT/CMD scripts are required. The persistent sidebar is desktop-only; mobile navigation remains the existing design. The homepage quick item experience and two-line price graph are retained.

## Build manually
From the project folder:

```bash
npm install
npm test
npm run build
```

Do not run `npm run db:migrate` for this release. Do not deploy until the production build and checks pass.

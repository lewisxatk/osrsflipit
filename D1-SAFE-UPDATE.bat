@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ================================================
echo OSRS HUB V56 - SAFE DATABASE + BUILD + DEPLOY
echo ================================================
where node >nul 2>nul || (echo ERROR: Install Node.js LTS first.& pause & exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm is missing. Reopen this window after installing Node.js.& pause & exit /b 1)
if not exist package.json (echo ERROR: package.json missing. Extract this BAT into the project root.& pause & exit /b 1)
echo [1/5] Installing dependencies...
npm install
if errorlevel 1 goto fail
echo [2/5] Applying pending D1 migrations to the remote database...
npx wrangler d1 migrations apply osrshub-accounts --remote
if errorlevel 1 goto fail
echo [3/5] Building frontend...
npm run build
if errorlevel 1 goto fail
echo [4/5] Deploying Worker and site assets...
npx wrangler deploy --config wrangler.jsonc
if errorlevel 1 goto fail
echo [5/5] Reading internal D1 writer status...
npx wrangler d1 execute osrshub-accounts --remote --command "SELECT key,value,updated_at FROM data_meta WHERE key IN ('d1_write_budget','data_ingestion_paused','market_sync','mapping_cursor');"
echo.
echo SUCCESS. Check Cloudflare Dashboard - D1 - osrshub-accounts - Metrics for actual rows_written.
pause
exit /b 0
:fail
echo.
echo UPDATE STOPPED. Read the error above and fix that step before retrying.
pause
exit /b 1

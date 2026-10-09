@echo off
setlocal
cd /d "%~dp0"
where npx >nul 2>nul
if errorlevel 1 (echo ERROR: npx not found. Install Node.js LTS.&pause&exit /b 1)
echo OSRS Hub D1 writer status
 echo.
npx wrangler d1 execute osrshub-accounts --remote --command "SELECT value, updated_at FROM data_meta WHERE key='d1_write_budget';"
echo.
echo This is the Hub's internal safety budget, not Cloudflare's live billing metric.
echo Cloudflare's dashboard remains the authoritative usage figure.
pause

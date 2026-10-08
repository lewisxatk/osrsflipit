@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ================================================
echo OSRS Hub - ONE CLICK SAFE D1 + SITE UPDATE
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not on PATH.
  echo Install Node.js LTS, restart Windows, then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available. Restart Windows after installing Node.js LTS.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: package.json was not found. Run this BAT from the OSRS Hub project folder.
  pause
  exit /b 1
)

echo [1/4] Installing/checking dependencies...
npm install
if errorlevel 1 goto :fail

echo.
echo [2/4] Applying any pending D1 migrations...
npx wrangler d1 migrations apply osrshub-accounts --remote
if errorlevel 1 goto :fail

echo.
echo [3/4] Building the production site...
npm run build
if errorlevel 1 goto :fail

echo.
echo [4/4] Deploying the Worker and site assets...
npx wrangler deploy --config wrangler.jsonc
if errorlevel 1 goto :fail

echo.
echo ================================================
echo SAFE UPDATE COMPLETE
echo ================================================
echo.
echo D1 writer protection is now active in the deployed Worker.
echo The live market continues to use the price API; D1 history is throttled.
echo.
pause
exit /b 0

:fail
echo.
echo ================================================
echo UPDATE FAILED
echo ================================================
echo Read the error above. Nothing else was changed by this BAT after the failing step.
pause
exit /b 1

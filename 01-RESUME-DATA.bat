@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OSRS Hub - RESUME SITE DATA
 echo ======================================================
echo OSRS HUB - RESUME SITE-WIDE DATA COLLECTION
echo ======================================================
echo This re-enables scheduled OSRS market/intelligence collection in D1.
echo It does not change user account data or Discord alert settings.
echo.
where npx >nul 2>nul
if errorlevel 1 goto no_npx
npx wrangler d1 execute osrshub-accounts --remote --command "INSERT INTO data_meta(key,value,updated_at) VALUES('data_ingestion_paused','0',strftime('%%s','now')*1000) ON CONFLICT(key) DO UPDATE SET value='0',updated_at=excluded.updated_at;"
if errorlevel 1 goto failed
echo.
echo SUCCESS: collection is enabled again. The next scheduled run will pick it up.
goto finish
:no_npx
echo ERROR: npx was not found. Install Node.js LTS and reopen Command Prompt.
goto finish
:failed
echo ERROR: Could not clear the pause flag. Check Cloudflare login, database binding/name and the error above.
:finish
echo.
pause
exit /b

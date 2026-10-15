@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OSRS Hub - EMERGENCY STOP SITE DATA
 echo ======================================================
echo OSRS HUB - EMERGENCY STOP SITE-WIDE DATA COLLECTION
echo ======================================================
echo This pauses scheduled OSRS market/intelligence collection in D1.
echo Live price API reads, user/account writes and Discord alerts remain enabled.
echo.
where npx >nul 2>nul
if errorlevel 1 goto no_npx
echo Writing the emergency pause flag to the REMOTE D1 database...
npx wrangler d1 execute osrshub-accounts --remote --command "INSERT INTO data_meta(key,value,updated_at) VALUES('data_ingestion_paused','1',strftime('%%s','now')*1000) ON CONFLICT(key) DO UPDATE SET value='1',updated_at=excluded.updated_at;"
if errorlevel 1 goto failed
echo.
echo SUCCESS: the emergency stop flag was written.
echo Scheduled collection will skip OSRS data until you run 01-RESUME-DATA.bat.
echo The scheduled Worker runs every minute, but market collection is gated to reduce D1 writes.
goto finish
:no_npx
echo ERROR: npx was not found. Install Node.js LTS and reopen Command Prompt.
goto finish
:failed
echo ERROR: Could not write the pause flag. Check Cloudflare login, database binding/name and the error above.
:finish
echo.
pause
exit /b

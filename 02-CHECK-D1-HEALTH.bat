@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OSRS Hub - LIVE D1 AND UPDATE HEALTH CHECK
set "CHECK_FAILED=0"
echo ======================================================
echo OSRS HUB - LIVE D1 + SITE UPDATE HEALTH CHECK
echo ======================================================
echo This checks the deployed Worker API, its D1 health response, and remote D1 tables.
echo It does NOT deploy or change anything. This window will pause before closing.
echo.
where npx >nul 2>nul
if errorlevel 1 (echo FAIL: npx not found; remote D1 SQL checks cannot run.&set "CHECK_FAILED=1")
where powershell.exe >nul 2>nul
if errorlevel 1 (echo FAIL: Windows PowerShell not found; live health response cannot be parsed.&set "CHECK_FAILED=1")

echo [1/3] Checking deployed Worker + D1 health API...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $h=Invoke-RestMethod -Uri 'https://osrsflipit.prices-app.workers.dev/api/data/health' -TimeoutSec 25; if (-not $h.ok -or -not $h.checks.databaseConnected) { Write-Host 'FAIL: API responded but the D1 health check failed.'; exit 1 }; Write-Host 'PASS: deployed Worker health endpoint responded and D1 queries succeeded.'; Write-Host ('Market cache rows: ' + $h.marketItems); Write-Host ('Historical snapshots: ' + $h.snapshots); Write-Host ('Item reference rows: ' + $h.itemsDatabase); Write-Host ('Internal writer estimate: ' + $h.d1Writer.writes + ' / ' + $h.d1Writer.softLimit + ' rows for ' + $h.d1Writer.day); if ($h.ingestionPaused) { Write-Host 'STATUS: SITE DATA INGESTION IS PAUSED by emergency stop. This is intentional if you ran the stop BAT.' } elseif (-not $h.lastMarketSyncAt) { Write-Host 'WARNING: No successful market sync metadata yet; first sync may still be pending.' } elseif ($h.marketSyncAgeMinutes -gt 20) { Write-Host ('FAIL: Last market sync is stale (' + $h.marketSyncAgeMinutes + ' minutes old); check Worker logs and D1 permissions.'); exit 1 } else { Write-Host ('PASS: last market sync was ' + $h.marketSyncAgeMinutes + ' minutes ago.') }; if (-not $h.checks.marketCachePresent) { Write-Host 'WARNING: D1 market cache is empty; this can be normal before the first successful collection pass.' }; Write-Host ('API checks: ' + ($h.checks | ConvertTo-Json -Compress)) } catch { Write-Host ('FAIL: Could not query the deployed health endpoint: ' + $_.Exception.Message); exit 1 }"
if errorlevel 1 set "CHECK_FAILED=1"
echo.
echo [2/3] Checking remote D1 metadata and emergency flag...
npx wrangler d1 execute osrshub-accounts --remote --command "SELECT key,value,updated_at FROM data_meta WHERE key IN ('data_ingestion_paused','market_sync','mapping_cursor','rich_sync_gate','wiki_content_gate','d1_write_budget') ORDER BY key;"
if errorlevel 1 (echo FAIL: Remote D1 metadata query failed.&set "CHECK_FAILED=1") else echo PASS: remote D1 metadata query completed.
echo.
echo [3/3] Checking required D1 tables...
npx wrangler d1 execute osrshub-accounts --remote --command "SELECT 'market_current' AS table_name,COUNT(*) AS row_count FROM market_current UNION ALL SELECT 'market_snapshots',COUNT(*) FROM market_snapshots UNION ALL SELECT 'osrs_items',COUNT(*) FROM osrs_items;"
if errorlevel 1 (echo FAIL: Required D1 table query failed. Apply pending migrations and inspect the Wrangler error.&set "CHECK_FAILED=1") else echo PASS: required market and item tables are accessible.
echo.
if "%CHECK_FAILED%"=="0" (echo RESULT: CHECKS COMPLETED. Read the status lines above; an intentional ingestion pause is not a database failure.) else (echo RESULT: ONE OR MORE CHECKS FAILED. Copy the error lines above before changing code or migrations.)
echo.
echo Cloudflare Dashboard - D1 - osrshub-accounts - Metrics is authoritative for actual rows_written.
echo The internal writer number is only the Hub's safety estimate.
echo.
pause
exit /b %CHECK_FAILED%

@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OSRS Hub - Consolidated Release Checks
set "CHECK_FAILED=0"

echo ============================================
echo OSRS Hub - CONSOLIDATED RELEASE CHECKS
echo ============================================
echo These checks are local only. They do NOT deploy or run database migrations.
echo.
where node >nul 2>nul || (echo FAIL: Node.js is not installed or not on PATH.& pause & exit /b 1)
where npm >nul 2>nul || (echo FAIL: npm is not installed or not on PATH.& pause & exit /b 1)
if not exist package.json goto missing
if not exist src\main.jsx goto missing
if not exist worker.js goto missing
if not exist tests\app-regression.test.mjs goto missing

echo [1/4] Worker syntax...
node --check worker.js
if errorlevel 1 (echo FAIL: Worker syntax. Do not deploy.& pause & exit /b 1)
echo PASS: Worker syntax.
echo.

echo [2/4] Automated regression tests...
call npm test
if errorlevel 1 (echo FAIL: Automated tests. Do not deploy.& pause & exit /b 1)
echo PASS: Automated tests.
echo.

if not exist node_modules (
  echo Installing project dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (echo FAIL: Dependency installation. Check network access and retry.& pause & exit /b 1)
)
echo [3/4] Dependencies are available.
echo.

echo [4/4] Frontend production build...
call npm run build
if errorlevel 1 (echo FAIL: Frontend build. Do not deploy.& pause & exit /b 1)
echo PASS: Frontend production build.
echo.
echo LOCAL CHECKS PASSED. Live Cloudflare/D1, browser/mobile and Discord regression checks remain separate.
echo No deployment or database migration was performed.
pause
exit /b 0

:missing
echo FAIL: A required project source/config/test file is missing from this ZIP.
pause
exit /b 1

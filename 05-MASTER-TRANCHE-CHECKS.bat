@echo off
setlocal
cd /d "%~dp0"
title OSRS Hub Master Roadmap Tranche Checks

echo ============================================
echo OSRS Hub - MASTER ROADMAP TRANCHE CHECKS
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo FAIL: Node.js is not installed or not on PATH.
  pause
  exit /b 1
)

echo [1/3] Worker syntax...
node --check worker.js
if errorlevel 1 (
  echo FAIL: Worker syntax check failed. Do not deploy.
  pause
  exit /b 1
)
echo PASS: Worker syntax.
echo.

echo [2/3] Check required roadmap files...
if not exist MASTER-ROADMAP-390-TRACKER.md goto missing
if not exist TUTORIAL-MASTER-ROADMAP-TRANCHE-1.md goto missing
if not exist RELEASE-NOTES-MASTER-TRANCHE-1.txt goto missing
echo PASS: Tracker, tutorial and release notes exist.
echo.

echo [3/3] Frontend production build...
if not exist node_modules (
  echo Installing dependencies first...
  call npm install
  if errorlevel 1 (
    echo FAIL: npm install failed. Check network access and retry.
    pause
    exit /b 1
  )
)
call npm run build
if errorlevel 1 (
  echo FAIL: Frontend production build failed. Do not deploy.
  pause
  exit /b 1
)
echo PASS: Frontend production build.
echo.
echo NOTE: This does not run live D1, browser, Cloudflare usage, or Discord tests.
pause
exit /b 0

:missing
echo FAIL: A required roadmap document is missing.
pause
exit /b 1

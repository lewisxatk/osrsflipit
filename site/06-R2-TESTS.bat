@echo off
setlocal
cd /d "%~dp0"
title OSRS Hub R2 Working Build Checks

echo ============================================
echo OSRS Hub - R2 WORKING BUILD CHECKS
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (echo FAIL: Node.js is not installed or not on PATH.& pause & exit /b 1)

echo [1/4] Worker syntax...
node --check worker.js
if errorlevel 1 (echo FAIL: Worker syntax. Do not deploy.& pause & exit /b 1)
echo PASS
echo.

echo [2/4] Worker endpoint regression tests...
call npm run test:worker
if errorlevel 1 (echo FAIL: Worker tests. Do not deploy.& pause & exit /b 1)
echo PASS
echo.

echo [3/4] Frontend dependencies...
if not exist node_modules (
  call npm install
  if errorlevel 1 (echo FAIL: Dependency install. Check network and retry.& pause & exit /b 1)
)
echo PASS
echo.

echo [4/4] Frontend production build...
call npm run build
if errorlevel 1 (echo FAIL: Frontend build. Do not deploy.& pause & exit /b 1)
echo PASS
echo.
echo LOCAL CHECKS PASSED. Live D1, Cloudflare usage, browser/mobile and Discord regression checks remain required.
pause
exit /b 0

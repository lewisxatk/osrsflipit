@echo off
setlocal
cd /d "%~dp0"
title OSRS Hub V100 Master Release Checks

echo ============================================
echo OSRS Hub R40 - MASTER RELEASE CHECKS
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not on PATH.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not installed or is not on PATH.
  pause
  exit /b 1
)

echo [1/3] Checking Worker JavaScript syntax...
node --check worker.js
if errorlevel 1 (
  echo FAIL: worker.js syntax check failed. Do not deploy.
  pause
  exit /b 1
)
echo PASS: Worker syntax.
echo.
if not exist node_modules (
  echo [2/3] Installing dependencies with npm install...
  npm install
  if errorlevel 1 (
    echo FAIL: dependency installation failed. Check network/proxy logs and retry.
    pause
    exit /b 1
  )
) else (
  echo [2/3] node_modules exists; skipping dependency install.
)
echo.
echo [3/4] Running automated regression tests...
npm test
if errorlevel 1 (
  echo FAIL: Automated tests failed. Do not deploy.
  pause
  exit /b 1
)
echo.
echo [4/4] Running Vite production build...
npm run build
if errorlevel 1 (
  echo FAIL: Vite production build failed. Do not deploy.
  pause
  exit /b 1
)
echo.
echo PASS: Worker syntax, automated tests, and frontend production build.
echo NOTE: This does not deploy or test Cloudflare D1, Discord, or live browser behaviour.
pause
exit /b 0

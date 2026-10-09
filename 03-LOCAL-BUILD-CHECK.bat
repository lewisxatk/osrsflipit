@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title OSRS Hub - LOCAL BUILD CHECK
echo ======================================================
echo OSRS HUB - LOCAL BUILD CHECK (NO DEPLOYMENT)
echo ======================================================
where node >nul 2>nul || (echo ERROR: Node.js is not installed.&pause&exit /b 1)
where npm >nul 2>nul || (echo ERROR: npm is not installed.&pause&exit /b 1)
if not exist package.json (echo ERROR: package.json missing. Run this from the extracted project root.&pause&exit /b 1)
echo [1/3] Checking Worker JavaScript syntax...
node --check worker.js
if errorlevel 1 goto fail
echo PASS: worker.js syntax is valid.
echo.
echo [2/3] Installing project dependencies...
npm install --no-audit --no-fund
if errorlevel 1 goto fail
echo.
echo [3/3] Running production Vite build...
npm run build
if errorlevel 1 goto fail
echo.
echo SUCCESS: Worker syntax and production frontend build both passed.
echo No deployment was performed. Check site/ output exists, then use your configured GitHub/Cloudflare deployment route.
echo.
pause
exit /b 0
:fail
echo.
echo BUILD CHECK FAILED. Copy the first complete error block before changing code or database migrations.
echo.
pause
exit /b 1

@echo off
setlocal
cd /d "%~dp0"
call "%~dp0D1-SAFE-UPDATE.bat"
exit /b %errorlevel%

@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it, then open this file again.
  pause
  exit /b 1
)
set "npm_config_cache=%TEMP%\bones-npm-cache"
if not exist node_modules (
  call npm ci
)
if errorlevel 1 (
  pause
  exit /b 1
)
call npm run lan
pause

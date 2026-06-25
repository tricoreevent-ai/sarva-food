@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo [build] typecheck
call npm run typecheck
if errorlevel 1 exit /b 1

echo [build] lint
call npm run lint
if errorlevel 1 exit /b 1

echo [build] production build
call npm run build
if errorlevel 1 exit /b 1

echo [build] diff check
git diff --check
if errorlevel 1 exit /b 1

echo [build] PASS
endlocal

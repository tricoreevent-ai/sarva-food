@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:: =========================================================
:: Sarva Food - LAN-ready Dev Launcher
:: =========================================================
:: HTTP MODE  : run.bat
:: HTTPS MODE : run.bat https
:: STOP       : Press CTRL + C
:: =========================================================

echo.
echo =====================================
echo     SARVA FOOD DEV STARTUP
echo =====================================
echo.

if "%PORT%"=="" set PORT=3000
set HTTPS_MODE=false
if /I "%1"=="https" set HTTPS_MODE=true

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo Install Node.js and try again.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found.
    echo Reinstall Node.js with npm support.
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] package.json not found.
    echo Run this file from the Sarva Food project root folder.
    pause
    exit /b 1
)

echo Stopping stale Sarva dev processes on known ports...
for %%p in (3000 3001 3002 3003 3443 3080) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R /C:":%%p .*LISTENING"') do (
        echo   Port %%p is busy by PID %%a. Stopping it...
        taskkill /PID %%a /F >nul 2>&1
        if errorlevel 1 (
            echo   [WARN] Could not stop PID %%a. Close it manually if startup fails.
        ) else (
            echo   Stopped PID %%a.
        )
    )
)

echo.
node scripts\show-lan-ip.mjs

echo =====================================
echo Starting Sarva Food Application
echo =====================================
if /I "%HTTPS_MODE%"=="true" (
    echo Mode : HTTPS LAN
    echo Note : For phones on the same Wi-Fi, open the Secure LAN URL printed above.
    echo        The phone browser may ask you to trust the local development certificate.
    echo.
    cmd /c npm run dev:lan:https
) else (
    echo Mode : HTTP LAN
    echo Note : For phones on the same Wi-Fi, open the Network URL printed above.
    echo.
    cmd /c npm run dev:lan
)

if errorlevel 1 (
    echo.
    echo =====================================
    echo APPLICATION STOPPED WITH ERROR
    echo =====================================
    echo Review the errors shown above.
    echo.
    pause
    exit /b 1
)

echo.
echo Application stopped.
pause

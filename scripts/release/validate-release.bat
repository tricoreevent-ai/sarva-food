@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0..\.."

if /I "%~1"=="--help" (
  echo Usage: %~nx0
  echo Starts the production server locally and validates key routes.
  exit /b 0
)
if /I "%~1"=="/?" (
  echo Usage: %~nx0
  echo Starts the production server locally and validates key routes.
  exit /b 0
)

set "LOG_DIR=%TEMP%\nammude-release"
set "OUT_LOG=%LOG_DIR%\nammude-release-start.out.log"
set "ERR_LOG=%LOG_DIR%\nammude-release-start.err.log"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul

call scripts\release\cleanup.bat
if errorlevel 1 exit /b 1

echo [validate] Starting production server
start "nammude-release-server" /b cmd /c "npm run start > ""%OUT_LOG%"" 2> ""%ERR_LOG%"""

set "READY="
for /l %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://127.0.0.1:3000/api/release-info; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"
  if not errorlevel 1 set "READY=1"
  if defined READY goto :ready
  timeout /t 2 /nobreak >nul
)

echo [validate] FAIL: server did not become ready.
type "%OUT_LOG%" 2>nul
type "%ERR_LOG%" 2>nul
exit /b 1

:ready
echo [validate] Server ready
powershell -NoProfile -Command "try { $j=Invoke-RestMethod -UseBasicParsing -TimeoutSec 15 http://127.0.0.1:3000/api/release-info; if (-not $j.currentCommitSha -or -not $j.currentBranch -or -not $j.buildTimestamp -or -not $j.deploymentEnvironment -or -not $j.publicAppUrl -or -not $j.applicationVersion) { exit 1 }; if ($j.publicAppUrl -match 'localhost|127\.0\.0\.1' -or $j.publicAppUrl -notmatch '^https://') { exit 1 }; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo [validate] FAIL: /api/release-info metadata is incomplete or has an invalid publicAppUrl.
  exit /b 1
)
echo [validate] PASS: release metadata

for %%P in (/ /api/release-info /api/owner/analytics) do (
  powershell -NoProfile -Command "$p='%%P'; try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 ('http://127.0.0.1:3000'+$p); if ($p -eq '/api/owner/analytics') { if ($r.StatusCode -ne 403 -and $r.StatusCode -ne 200) { exit 1 } } elseif ($r.StatusCode -ne 200) { exit 1 }; exit 0 } catch { if ($p -eq '/api/owner/analytics' -and $_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 403) { exit 0 }; exit 1 }"
  if errorlevel 1 (
    echo [validate] FAIL: %%P
    exit /b 1
  )
  echo [validate] PASS: %%P
)

echo [validate] PASS
endlocal

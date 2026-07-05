@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0..\.."

if /I "%~1"=="--help" (
  echo Usage: %~nx0
  echo Verifies PRODUCTION_URL serves the current commit and smoke routes.
  exit /b 0
)
if /I "%~1"=="/?" (
  echo Usage: %~nx0
  echo Verifies PRODUCTION_URL serves the current commit and smoke routes.
  exit /b 0
)

if "%PRODUCTION_URL%"=="" (
  echo [production] FAIL: set PRODUCTION_URL, for example https://nammude.example
  exit /b 1
)

for /f %%S in ('git rev-parse HEAD') do set "EXPECTED_SHA=%%S"
set /a "TIMEOUT_SECONDS=%PRODUCTION_VERIFY_TIMEOUT_SECONDS%"
if "%TIMEOUT_SECONDS%"=="0" set /a "TIMEOUT_SECONDS=900"
set /a "TRIES=%TIMEOUT_SECONDS% / 15"
if "%TRIES%"=="0" set /a "TRIES=1"

echo [production] Waiting for %EXPECTED_SHA% at %PRODUCTION_URL%/api/release-info
for /l %%I in (1,1,%TRIES%) do (
  for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "try { $j=Invoke-RestMethod -TimeoutSec 15 '%PRODUCTION_URL%/api/release-info'; $s=@($j.gitCommit,$j.commitSha,$j.sha,$j.releaseSha) | Where-Object { $_ } | Select-Object -First 1; if ($s) { Write-Output $s } else { Write-Output '' } } catch { Write-Output '' }"`) do set "SEEN_SHA=%%R"
  echo [production] Try %%I: !SEEN_SHA!
  if "!SEEN_SHA!"=="%EXPECTED_SHA%" goto :deployed
  timeout /t 15 /nobreak >nul
)

echo [production] FAIL: expected SHA not served.
exit /b 1

:deployed
for %%P in (/ /api/release-info /api/public/restaurants) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 ('%PRODUCTION_URL%'+ '%%P'); if ($r.StatusCode -ne 200) { exit 1 }; exit 0 } catch { exit 1 }"
  if errorlevel 1 (
    echo [production] FAIL: %%P
    exit /b 1
  )
  echo [production] PASS: %%P
)

echo [production] PASS
endlocal

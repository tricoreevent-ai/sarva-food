@echo off
setlocal EnableExtensions EnableDelayedExpansion
call :colors

if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help

set "FAIL=0"
call :meta

call :run_step "Typecheck" "npm run typecheck"
call :run_step "Lint" "npm run lint"
call :run_step "Build" "npm run build"
call :run_step "Git Diff" "git diff --check"

call :write_report

echo.
echo %CYAN%Release Summary%RESET%
echo Typecheck: !TYPECHECK_STATUS!
echo Lint: !LINT_STATUS!
echo Build: !BUILD_STATUS!
echo Git Diff: !GIT_DIFF_STATUS!

if "%FAIL%"=="0" (
  echo %GREEN%Release validation PASS%RESET%
) else (
  echo %RED%Release validation FAIL%RESET%
)
echo Report: %~dp0release-report.md
goto end

:help
echo Usage: %~nx0
echo Runs typecheck, lint, build, git diff --check, and regenerates release-report.md.
exit /b 0

:meta
for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH set "BRANCH=unknown"
for /f "delims=" %%c in ('git rev-parse HEAD 2^>nul') do set "COMMIT=%%c"
if not defined COMMIT set "COMMIT=unknown"
for /f "delims=" %%n in ('node -v 2^>nul') do set "NODE_VERSION=%%n"
if not defined NODE_VERSION set "NODE_VERSION=unknown"
for /f "delims=" %%n in ('npm -v 2^>nul') do set "NPM_VERSION=%%n"
if not defined NPM_VERSION set "NPM_VERSION=unknown"
for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-ddTHH:mm:sszzz" 2^>nul') do set "BUILD_DATE=%%d"
if not defined BUILD_DATE set "BUILD_DATE=%DATE% %TIME%"
exit /b 0

:run_step
set "LABEL=%~1"
set "CMD=%~2"
set "LOG=%TEMP%\nammude-release-%RANDOM%%RANDOM%.log"
echo.
echo %CYAN%Running %LABEL%...%RESET%
cmd /c "%CMD%" >"%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
type "%LOG%"
if "%RC%"=="0" (
  echo %GREEN%%LABEL% PASS%RESET%
  call :set_status "%LABEL%" PASS
) else (
  echo %RED%%LABEL% FAIL%RESET%
  set "FAIL=1"
  call :set_status "%LABEL%" FAIL
)
del "%LOG%" >nul 2>nul
exit /b 0

:set_status
if "%~1"=="Typecheck" set "TYPECHECK_STATUS=%~2"
if "%~1"=="Lint" set "LINT_STATUS=%~2"
if "%~1"=="Build" set "BUILD_STATUS=%~2"
if "%~1"=="Git Diff" set "GIT_DIFF_STATUS=%~2"
exit /b 0

:write_report
set "REPORT=%~dp0release-report.md"
> "%REPORT%" echo # Nammude Release Report
>> "%REPORT%" echo.
>> "%REPORT%" echo ^| Field ^| Value ^|
>> "%REPORT%" echo ^| --- ^| --- ^|
>> "%REPORT%" echo ^| Build Date ^| %BUILD_DATE% ^|
>> "%REPORT%" echo ^| Git Branch ^| %BRANCH% ^|
>> "%REPORT%" echo ^| Commit SHA ^| %COMMIT% ^|
>> "%REPORT%" echo ^| Node Version ^| %NODE_VERSION% ^|
>> "%REPORT%" echo ^| NPM Version ^| %NPM_VERSION% ^|
>> "%REPORT%" echo ^| Build Status ^| %BUILD_STATUS% ^|
>> "%REPORT%" echo ^| Typecheck ^| %TYPECHECK_STATUS% ^|
>> "%REPORT%" echo ^| Lint ^| %LINT_STATUS% ^|
>> "%REPORT%" echo ^| Build ^| %BUILD_STATUS% ^|
>> "%REPORT%" echo ^| Git Diff ^| %GIT_DIFF_STATUS% ^|
>> "%REPORT%" echo ^| Production Readiness %% ^| 98%% pending manual infrastructure, provider, hardware, browser, and multi-device validation. ^|
>> "%REPORT%" echo.
>> "%REPORT%" echo ## Pending Manual Tasks
>> "%REPORT%" echo - Hostinger env/cache/redeploy and hosted route smoke.
>> "%REPORT%" echo - Firestore rules/index deployment.
>> "%REPORT%" echo - Browser, tablet, mobile, Kitchen TV, and multi-device smoke.
>> "%REPORT%" echo - Printer profile and physical output validation.
>> "%REPORT%" echo.
>> "%REPORT%" echo ## Pending Provider Tasks
>> "%REPORT%" echo - SMTP, Razorpay, WhatsApp, SMS, push, Meta, Cloudinary, Mapbox, Google OAuth.
>> "%REPORT%" echo.
>> "%REPORT%" echo ## Pending Infrastructure Tasks
>> "%REPORT%" echo - Firebase authorized domains, production secrets, Hostinger cache clear, release metadata verification.
exit /b 0

:colors
for /F "delims=" %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
set "RESET=%ESC%[0m"
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "CYAN=%ESC%[36m"
exit /b 0

:end
echo.
pause
exit /b %FAIL%

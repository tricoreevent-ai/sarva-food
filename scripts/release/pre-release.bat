@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

if /I "%~1"=="--help" (
  echo Usage: %~nx0
  echo Runs cleanup, branch display, diff check, conflict check, and git status.
  exit /b 0
)
if /I "%~1"=="/?" (
  echo Usage: %~nx0
  echo Runs cleanup, branch display, diff check, conflict check, and git status.
  exit /b 0
)

call scripts\release\cleanup.bat
if errorlevel 1 exit /b 1

for /f %%B in ('git branch --show-current') do set "BRANCH=%%B"
echo [pre-release] Branch: %BRANCH%
if "%BRANCH%"=="" (
  echo [pre-release] FAIL: could not detect current branch.
  exit /b 1
)

git diff --check
if errorlevel 1 exit /b 1

git diff --name-only --diff-filter=U | findstr . >nul
if not errorlevel 1 (
  echo [pre-release] FAIL: merge conflicts present.
  exit /b 1
)

git status --short
echo [pre-release] PASS
endlocal

@echo off
setlocal enabledelayedexpansion

REM Navigate to the repository root where this batch file is located.
cd /d %~dp0

REM Ensure git is available.
where git >nul 2>&1
if errorlevel 1 (
  echo Git is not installed or not available on PATH.
  exit /b 1
)

REM Ensure the origin remote is set to the expected repository.
set "TARGET_REMOTE=https://github.com/tricoreevent-ai/sarva-food.git"
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%R"
if not defined ORIGIN_URL (
  echo No origin remote found. Adding origin remote to %TARGET_REMOTE%.
  git remote add origin %TARGET_REMOTE%
) else if /I "%ORIGIN_URL%" neq "%TARGET_REMOTE%" (
  echo Current origin remote is: %ORIGIN_URL%
  echo Expected origin remote is: %TARGET_REMOTE%
  echo The script will continue, but verify this is the correct repository before pushing.
)

REM Determine the current branch.
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "BRANCH=%%B"
if not defined BRANCH set "BRANCH=main"

REM Use the provided argument as the commit message, or default if none is provided.
if "%~1"=="" (
  set "COMMIT_MSG=Update code"
) else (
  set "COMMIT_MSG=%~1"
)

echo Preparing to commit on branch '%BRANCH%' to remote 'origin'.
echo Commit message: "%COMMIT_MSG%"

REM Stage all changes.
git add -A
if errorlevel 1 (
  echo Failed to stage changes.
  exit /b 1
)

REM Commit only when there are staged changes.
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo Commit failed.
    exit /b 1
  )
) else (
  echo No changes to commit.
)

REM Safety guard: do not push known production environment reference material.
git rev-parse --verify origin/%BRANCH% >nul 2>&1
if not errorlevel 1 (
  git log --format=%%H origin/%BRANCH%..HEAD -- production-env-reference.txt | findstr /R "." >nul
  if not errorlevel 1 (
    echo Refusing to push: unpushed history contains production-env-reference.txt.
    echo Remove that file from branch history before pushing to GitHub.
    exit /b 2
  )
)

REM Push to the configured origin branch.
git push origin %BRANCH%
if errorlevel 1 (
  echo Push failed.
  exit /b 1
)

echo Commit and push completed successfully.
endlocal

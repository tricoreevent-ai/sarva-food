@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

for /f %%S in ('git rev-parse --short HEAD') do set "BEFORE_SHA=%%S"
echo [deploy] Current SHA: %BEFORE_SHA%

git add -A
if errorlevel 1 exit /b 1

git diff --cached --quiet
if not errorlevel 1 (
  echo [deploy] Nothing to commit.
) else (
  git commit -m "feat: enterprise stabilization release" -m "Admin repository migration, customer repository migration, staff access, view switching, printer repository, audit repository, browser validation, production validation, and documentation release workflow."
  if errorlevel 1 exit /b 1
)

for /f %%S in ('git rev-parse HEAD') do set "SHA=%%S"
echo [deploy] Release SHA: %SHA%

git push origin main
if errorlevel 1 exit /b 1

git push origin main:release/production-nammude
if errorlevel 1 exit /b 1

for /f %%S in ('git ls-remote origin refs/heads/main') do set "MAIN_REMOTE=%%S"
for /f %%S in ('git ls-remote origin refs/heads/release/production-nammude') do set "REL_REMOTE=%%S"

echo [deploy] origin/main=%MAIN_REMOTE%
echo [deploy] origin/release/production-nammude=%REL_REMOTE%

if not "%MAIN_REMOTE%"=="%SHA%" exit /b 1
if not "%REL_REMOTE%"=="%SHA%" exit /b 1

echo [deploy] PASS
endlocal

@echo off
setlocal EnableExtensions EnableDelayedExpansion
call :colors

if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help

call :require_git || goto end
call :require_repo || goto end
call :detect_branch || goto end
call :require_origin || goto end

echo %CYAN%Syncing branch:%RESET% %BRANCH%
call :run git fetch || goto end
call :run git pull --rebase || (
  call :conflict_help
  goto end
)
call :run git push origin "%BRANCH%" || goto end
echo %GREEN%Sync completed.%RESET%
goto end

:help
echo Usage: %~nx0
echo Runs git fetch, git pull --rebase, then pushes the current branch.
exit /b 0

:require_git
where git >nul 2>nul
if errorlevel 1 (
  echo %RED%Git is not installed or not on PATH.%RESET%
  exit /b 1
)
exit /b 0

:require_repo
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo %RED%Git repository not found.%RESET%
  exit /b 1
)
exit /b 0

:detect_branch
for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH (
  echo %RED%Could not detect a branch. Detached HEAD is not supported by this helper.%RESET%
  exit /b 1
)
exit /b 0

:require_origin
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo %RED%Remote not configured.%RESET%
  exit /b 1
)
exit /b 0

:run
set "LOG=%TEMP%\nammude-release-%RANDOM%%RANDOM%.log"
%* >"%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
type "%LOG%"
if not "%RC%"=="0" (
  call :explain_error "%LOG%"
  del "%LOG%" >nul 2>nul
  exit /b %RC%
)
del "%LOG%" >nul 2>nul
exit /b 0

:explain_error
findstr /I /C:"Invalid username or token" /C:"Password authentication is not supported" /C:"Authentication failed" "%~1" >nul 2>nul && call :auth_help
findstr /I /C:"CONFLICT" /C:"Resolve all conflicts manually" /C:"could not apply" "%~1" >nul 2>nul && call :conflict_help
findstr /I /C:"Could not resolve host" /C:"Failed to connect" /C:"Network is unreachable" "%~1" >nul 2>nul && echo %RED%No internet connection or GitHub is unreachable.%RESET%
exit /b 0

:conflict_help
echo.
echo %RED%Merge or rebase conflict detected.%RESET%
echo Recovery:
echo 1. Run git status
echo 2. Open each conflicted file and resolve the conflict markers.
echo 3. Run git add ^<file^>
echo 4. Run git rebase --continue
echo To cancel the rebase, run git rebase --abort
exit /b 0

:auth_help
echo.
echo %RED%Authentication Failed%RESET%
echo Possible Solutions:
echo 1. Use a GitHub Personal Access Token.
echo 2. Configure Git Credential Manager: git credential-manager configure
echo 3. Use SSH authentication: ssh -T git@github.com
echo Run scripts\release\github-auth-help.bat for guided setup.
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
exit /b %ERRORLEVEL%

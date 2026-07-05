@echo off
setlocal EnableExtensions EnableDelayedExpansion
call :colors

if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help

call :require_git || goto end
call :require_repo || goto end
call :detect_branch || goto end
call :require_origin || goto end

echo %CYAN%Current branch:%RESET% %BRANCH%
echo.
git status
echo.

set "HAS_CHANGES="
for /f "delims=" %%a in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES (
  echo %YELLOW%No changes to commit.%RESET%
  goto end
)

set /p "MSG=Commit message [Release: Production deployment]: "
if "%MSG%"=="" set "MSG=Release: Production deployment"

call :run git add -A || goto end
call :run git commit -m "%MSG%" || goto end
call :run git push origin "%BRANCH%" || goto end

echo %GREEN%Commit and push completed.%RESET%
goto end

:help
echo Usage: %~nx0
echo Stages all changes, commits with a prompt, and pushes the current branch.
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
  echo Open this script from inside the project repository.
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
  echo Add a remote with: git remote add origin ^<repository-url^>
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
findstr /I /C:"not a git repository" /C:"fatal: not in a git directory" "%~1" >nul 2>nul && echo %RED%Git repository not found.%RESET%
findstr /I /C:"No configured push destination" /C:"does not appear to be a git repository" "%~1" >nul 2>nul && echo %RED%Remote not configured or unreachable.%RESET%
findstr /I /C:"Could not resolve host" /C:"Failed to connect" /C:"Network is unreachable" "%~1" >nul 2>nul && echo %RED%No internet connection or GitHub is unreachable.%RESET%
exit /b 0

:auth_help
echo.
echo %RED%Authentication Failed%RESET%
echo Possible Solutions:
echo 1. Use a GitHub Personal Access Token when Git asks for a password.
echo 2. Configure Git Credential Manager: git credential-manager configure
echo 3. Use SSH authentication and update origin to git@github.com:^<owner^>/^<repo^>.git
echo Run scripts\release\github-auth-help.bat for guided setup.
exit /b 0

:colors
for /F "delims=" %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
set "RESET=%ESC%[0m"
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "CYAN=%ESC%[36m"
exit /b 0

:end
echo.
pause
exit /b %ERRORLEVEL%

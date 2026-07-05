@echo off
setlocal EnableExtensions
call :colors

if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help

echo %CYAN%GitHub Authentication Help%RESET%
echo.
echo Option 1: Git Credential Manager
echo   git credential-manager configure
echo   git remote -v
echo.
echo Option 2: GitHub Personal Access Token
echo   1. Create a token in GitHub Developer settings.
echo   2. Give it repository push access.
echo   3. Use your GitHub username and paste the token as the password.
echo.
echo Option 3: SSH Authentication
echo   ssh -T git@github.com
echo   git remote -v
echo   git remote set-url origin git@github.com:^<owner^>/^<repo^>.git
echo.
echo If Git says "Invalid username or token" or "Password authentication is not supported",
echo switch to a Personal Access Token, Git Credential Manager, or SSH.
echo.
set /p "CHOICE=Show current remote URLs now? [y/N]: "
if /I "%CHOICE%"=="Y" git remote -v
goto end

:help
echo Usage: %~nx0
echo Shows beginner-friendly GitHub authentication recovery instructions.
exit /b 0

:colors
for /F "delims=" %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
set "RESET=%ESC%[0m"
set "CYAN=%ESC%[36m"
exit /b 0

:end
echo.
pause
exit /b 0

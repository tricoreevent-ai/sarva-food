@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help

call scripts\release\git-commit-push.bat
exit /b %ERRORLEVEL%

:help
echo Usage: %~nx0
echo Compatibility wrapper for git-commit-push.bat. Detects the current branch dynamically.
exit /b 0

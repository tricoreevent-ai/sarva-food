@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0..\.."

if /I "%~1"=="--help" (
  echo Usage: %~nx0
  echo Stops local Node processes for this workspace and removes release build leftovers.
  exit /b 0
)
if /I "%~1"=="/?" (
  echo Usage: %~nx0
  echo Stops local Node processes for this workspace and removes release build leftovers.
  exit /b 0
)

echo [cleanup] Workspace: %CD%

powershell -NoProfile -ExecutionPolicy Bypass -Command "$cwd=(Get-Location).Path; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($cwd) -and ($_.Name -match '^(node|npm|npx)\.exe$' -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'next.*start')) } | ForEach-Object { Write-Host ('[cleanup] Stopping process ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for /r ".next" %%F in (*.lock) do (
  echo [cleanup] Removing stale lock %%F
  del /f /q "%%F" >nul 2>nul
)

if exist ".next\dev" (
  echo [cleanup] Removing stale .next\dev
  rmdir /s /q ".next\dev" >nul 2>nul
)

if exist "tmp\release-validation" (
  echo [cleanup] Removing tmp\release-validation
  rmdir /s /q "tmp\release-validation" >nul 2>nul
)

echo [cleanup] PASS
endlocal

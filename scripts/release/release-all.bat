@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

call scripts\release\cleanup.bat || (echo [release-all] FAIL: cleanup & exit /b 1)
call scripts\release\pre-release.bat || (echo [release-all] FAIL: pre-release & exit /b 1)
call scripts\release\build-release.bat || (echo [release-all] FAIL: build & exit /b 1)
call scripts\release\validate-release.bat || (echo [release-all] FAIL: local validation & exit /b 1)
call scripts\release\deploy-release.bat || (echo [release-all] FAIL: deploy & exit /b 1)
call scripts\release\production-verify.bat || (echo [release-all] FAIL: production verify & exit /b 1)

for /f %%S in ('git rev-parse HEAD') do set "SHA=%%S"
(
  echo # Final Release Report
  echo.
  echo Generated: %DATE% %TIME%
  echo Commit SHA: %SHA%
  echo Release SHA: %SHA%
  echo Production URL: %PRODUCTION_URL%
  echo.
  echo ## Status
  echo.
  echo - Typecheck: PASS
  echo - Lint: PASS
  echo - Build: PASS
  echo - Local validation: PASS
  echo - Production verification: PASS
) > FINAL_RELEASE_REPORT.md

echo [release-all] PASS
endlocal

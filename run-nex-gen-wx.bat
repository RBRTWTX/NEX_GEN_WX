@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Dependencies are not installed. Run setup-nex-gen-wx.bat first.
  pause
  exit /b 1
)

echo Preparing NEX GEN WX build cache...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\prepare-windows-build-cache.ps1" -ProjectRoot "%CD%" -TargetDir "%CD%\src-tauri\target"
if errorlevel 1 goto :error

call npm run tauri:dev
if errorlevel 1 goto :error
pause
exit /b 0

:error
echo.
echo NEX GEN WX did not start. Review the error above.
pause
exit /b 1

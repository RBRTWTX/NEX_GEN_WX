@echo off
setlocal
cd /d "%~dp0"

echo Preparing NEX GEN WX build cache...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\prepare-windows-build-cache.ps1" -ProjectRoot "%CD%" -TargetDir "%CD%\src-tauri\target"
if errorlevel 1 goto :error

echo Installing NEX GEN WX dependencies...
call npm install
if errorlevel 1 goto :error

echo Validating NEX GEN WX source and reference inventory...
call npm run validate
if errorlevel 1 goto :error

echo Running native Rust provider and storage regression tests...
where cargo >nul 2>&1
if errorlevel 1 (
  echo Cargo was not found. Install Rust through rustup and reopen this window.
  goto :error
)
cargo test --manifest-path "%CD%\src-tauri\Cargo.toml" --lib
if errorlevel 1 goto :error

echo.
echo Setup completed successfully.
echo Run run-nex-gen-wx.bat to start development mode.
pause
exit /b 0

:error
echo.
echo Setup failed. Review the error above.
pause
exit /b 1

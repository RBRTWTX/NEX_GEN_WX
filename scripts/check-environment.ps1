$ErrorActionPreference = "Continue"
Write-Host "NEX GEN WX environment check" -ForegroundColor Cyan
Write-Host ""
node --version
npm --version
rustc --version
cargo --version
git --version
Write-Host ""
Write-Host "Checking MSVC Build Tools..." -ForegroundColor Cyan
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
  & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
} else {
  Write-Warning "vswhere.exe was not found. Open Visual Studio Installer and confirm Desktop development with C++."
}

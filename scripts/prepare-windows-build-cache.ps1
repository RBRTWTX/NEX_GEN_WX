param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRoot,

  [Parameter(Mandatory = $true)]
  [string]$TargetDir,

  [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Remove-MatchingDirectories {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BasePath,

    [Parameter(Mandatory = $true)]
    [string[]]$Patterns
  )

  foreach ($pattern in $Patterns) {
    $searchPath = Join-Path $BasePath $pattern
    Get-ChildItem -Path $searchPath -Force -ErrorAction SilentlyContinue |
      ForEach-Object {
        Write-Host "  Removing stale build metadata: $($_.FullName)" -ForegroundColor DarkGray
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
      }
  }
}

$projectRootFull = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
$targetDirFull = [System.IO.Path]::GetFullPath($TargetDir).TrimEnd('\')
$markerPath = Join-Path $targetDirFull '.ngws-project-root.txt'

if (-not (Test-Path -LiteralPath $targetDirFull)) {
  New-Item -ItemType Directory -Path $targetDirFull -Force | Out-Null
}

$previousRoot = ''
if (Test-Path -LiteralPath $markerPath) {
  $previousRoot = (Get-Content -LiteralPath $markerPath -Raw -ErrorAction SilentlyContinue).Trim()
}

$rootChanged = $previousRoot -and -not $previousRoot.Equals($projectRootFull, [System.StringComparison]::OrdinalIgnoreCase)
$untrackedExistingCache = (-not $previousRoot) -and ((Get-ChildItem -LiteralPath $targetDirFull -Force -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
$needsRefresh = $Force -or $rootChanged -or $untrackedExistingCache

if ($needsRefresh) {
  Write-Host 'Refreshing generated Tauri build metadata for this project folder...' -ForegroundColor Yellow

  $patterns = @(
    'debug\build\tauri-*',
    'debug\.fingerprint\tauri-*',
    'debug\build\nextgen-weather-studio-*',
    'debug\build\nex-gen-wx-*',
    'debug\.fingerprint\nextgen-weather-studio-*',
    'debug\.fingerprint\nex-gen-wx-*',
    'release\build\tauri-*',
    'release\.fingerprint\tauri-*',
    'release\build\nextgen-weather-studio-*',
    'release\build\nex-gen-wx-*',
    'release\.fingerprint\nextgen-weather-studio-*',
    'release\.fingerprint\nex-gen-wx-*'
  )

  Remove-MatchingDirectories -BasePath $targetDirFull -Patterns $patterns

  if ($rootChanged) {
    Write-Host "Build cache moved from:`n  $previousRoot`nTo:`n  $projectRootFull" -ForegroundColor DarkYellow
  }
}

Set-Content -LiteralPath $markerPath -Value $projectRootFull -NoNewline -Encoding UTF8
Write-Host 'Tauri build cache is aligned with the current project folder.' -ForegroundColor Green

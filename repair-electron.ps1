$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronDir = Join-Path $project "node_modules\electron"
$electronPackage = Join-Path $electronDir "package.json"
$electronExe = Join-Path $electronDir "dist\electron.exe"

if (Test-Path $electronExe) {
  Write-Host "Electron is already installed."
  exit 0
}

if (-not (Test-Path $electronPackage)) {
  Write-Host "Electron package is missing. Run npm install first."
  exit 1
}

try {
  Push-Location $project
  node "node_modules\electron\install.js"
} finally {
  Pop-Location
}

if (Test-Path $electronExe) {
  Write-Host "Electron repaired by installer."
  exit 0
}

$package = Get-Content $electronPackage -Raw | ConvertFrom-Json
$version = $package.version
$cacheRoot = Join-Path $env:LOCALAPPDATA "electron\Cache"
$zip = Get-ChildItem $cacheRoot -Recurse -File -Filter "electron-v$version-win32-x64.zip" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $zip) {
  Write-Host "Electron archive was not found in cache."
  exit 1
}

$dist = Join-Path $electronDir "dist"
New-Item -ItemType Directory -Path $dist -Force | Out-Null
Expand-Archive -LiteralPath $zip.FullName -DestinationPath $dist -Force
Set-Content -LiteralPath (Join-Path $electronDir "path.txt") -Value "electron.exe" -NoNewline

if (Test-Path $electronExe) {
  Write-Host "Electron repaired from cache."
  exit 0
}

Write-Host "Electron repair failed."
exit 1

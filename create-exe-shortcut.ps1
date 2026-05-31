$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$exePath = Join-Path $project "dist\Checkers Online.exe"
$shortcutPath = Join-Path $desktop "Checkers Online.lnk"

if (-not (Test-Path $exePath)) {
  Write-Host "EXE was not found: $exePath"
  exit 1
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = Split-Path -Parent $exePath
$shortcut.IconLocation = $exePath
$shortcut.Description = "Launch online checkers"
$shortcut.Save()

Write-Host "Shortcut created: $shortcutPath"

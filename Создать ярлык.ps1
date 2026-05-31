$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Checkers Online.lnk"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $project "Запустить шашки.bat"
$shortcut.WorkingDirectory = $project
$shortcut.IconLocation = Join-Path $project "assets\checkers-icon.ico"
$shortcut.Description = "Launch online checkers"
$shortcut.Save()

Write-Host "Ярлык создан: $shortcutPath"

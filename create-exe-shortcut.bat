@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-exe-shortcut.ps1"

echo.
echo Done. Shortcut should now be on the desktop.
pause

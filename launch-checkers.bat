@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing or repairing dependencies...
  npm install
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies. Make sure Node.js is installed.
    pause
    exit /b 1
  )
  if not exist "node_modules\electron\dist\electron.exe" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0repair-electron.ps1"
    if errorlevel 1 (
      echo.
      echo Electron could not be repaired automatically.
      pause
      exit /b 1
    )
  )
)

npm start

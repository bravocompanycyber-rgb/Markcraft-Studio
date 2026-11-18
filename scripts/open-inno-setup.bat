@echo off
set "ISS=%~dp0..\installer\MarkcraftStudio.iss"
set "IDE="
if exist "%LOCALAPPDATA%\Programs\Inno Setup 7\ISIDE.exe" set "IDE=%LOCALAPPDATA%\Programs\Inno Setup 7\ISIDE.exe"
if exist "C:\Users\bntcl\AppData\Local\Programs\Inno Setup 7\ISIDE.exe" set "IDE=C:\Users\bntcl\AppData\Local\Programs\Inno Setup 7\ISIDE.exe"
if exist "%ProgramFiles(x86)%\Inno Setup 7\ISIDE.exe" set "IDE=%ProgramFiles(x86)%\Inno Setup 7\ISIDE.exe"

if "%IDE%"=="" (
  echo Inno Setup IDE not found. Open installer\MarkcraftStudio.iss manually.
  pause
  exit /b 1
)
start "" "%IDE%" "%ISS%"

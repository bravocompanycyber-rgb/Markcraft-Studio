@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Markcraft Studio — Production Installer Builder
color 0A
cd /d "%~dp0.."

echo.
echo ============================================================
echo   MARKCRAFT STUDIO 1.0  —  PRODUCTION INSTALLER BUILDER
echo ============================================================
echo.
echo   Working folder:
echo   %CD%
echo.
echo   This will:
echo     1. Install npm dependencies if needed
echo     2. Build the Windows application
echo     3. Compile the Inno Setup installer
echo.
echo ============================================================
echo.

set "FAILED=0"

REM ---------- Step 1: Dependencies ----------
echo [1/4] Checking dependencies...
if not exist "node_modules\electron" (
  echo       node_modules missing — running npm install...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo ************************************************************
    echo   FAILED at step 1: npm install
    echo ************************************************************
    echo.
    echo   Make sure Node.js 16+ is installed and on PATH.
    echo   Download free from: https://nodejs.org
    echo.
    set "FAILED=1"
    goto :END
  )
  echo       Dependencies installed.
) else (
  echo       Dependencies already present.
)
echo.

REM ---------- Step 2: Build app ----------
echo [2/4] Building application with electron-builder...
echo.
call npm run dist:dir
if errorlevel 1 (
  echo.
  echo ************************************************************
  echo   FAILED at step 2: electron-builder
  echo ************************************************************
  echo.
  set "FAILED=1"
  goto :END
)

if not exist "release\win-unpacked\Markcraft Studio.exe" (
  echo.
  echo ************************************************************
  echo   FAILED at step 2: Markcraft Studio.exe was not created
  echo ************************************************************
  echo   Expected: release\win-unpacked\Markcraft Studio.exe
  echo.
  set "FAILED=1"
  goto :END
)
echo       Application built successfully.
echo.

REM ---------- Step 3: Find Inno Setup ----------
echo [3/4] Locating Inno Setup Compiler (ISCC.exe)...
set "ISCC="

if exist "%LOCALAPPDATA%\Programs\Inno Setup 7\ISCC.exe" (
  set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 7\ISCC.exe"
)
if exist "C:\Users\bntcl\AppData\Local\Programs\Inno Setup 7\ISCC.exe" (
  set "ISCC=C:\Users\bntcl\AppData\Local\Programs\Inno Setup 7\ISCC.exe"
)
if exist "%ProgramFiles(x86)%\Inno Setup 7\ISCC.exe" (
  set "ISCC=%ProgramFiles(x86)%\Inno Setup 7\ISCC.exe"
)
if exist "%ProgramFiles%\Inno Setup 7\ISCC.exe" (
  set "ISCC=%ProgramFiles%\Inno Setup 7\ISCC.exe"
)
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
  set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
)

if "!ISCC!"=="" (
  echo.
  echo ************************************************************
  echo   FAILED at step 3: Inno Setup Compiler not found
  echo ************************************************************
  echo.
  echo   Download the FREE Inno Setup from:
  echo   https://jrsoftware.org/isinfo.php
  echo.
  echo   After installing, run this bat again.
  echo   Or open this file manually in Inno Setup and press Compile:
  echo   installer\MarkcraftStudio.iss
  echo.
  set "FAILED=1"
  goto :END
)

echo       Found: !ISCC!
echo.

REM ---------- Step 4: Compile installer ----------
echo [4/4] Compiling installer...
if not exist "release-installer" mkdir "release-installer"

"!ISCC!" "installer\MarkcraftStudio.iss"
if errorlevel 1 (
  echo.
  echo ************************************************************
  echo   FAILED at step 4: Inno Setup compilation
  echo ************************************************************
  echo.
  set "FAILED=1"
  goto :END
)

echo.
echo ============================================================
echo   SUCCESS — INSTALLER READY
echo ============================================================
echo.
echo   Your installer is here:
echo.
echo   %CD%\release-installer\Markcraft-Studio-Setup-1.2.0.exe
echo.
echo   You can copy that .exe to any Windows computer and install.
echo.
echo ============================================================
echo.

:END
if "!FAILED!"=="1" (
  color 0C
  echo.
  echo   BUILD FAILED — see messages above.
  echo.
) else (
  color 0A
  echo   BUILD SUCCESSFUL.
  echo.
)
echo   Press any key to close this window...
pause >nul
endlocal
exit /b %FAILED%

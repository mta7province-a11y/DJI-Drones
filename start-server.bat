@echo off
title AirL Aerial Cinematography — Backend Server
cls
echo ===================================================================
echo     AIRL AERIAL CINEMATOGRAPHY — BACKEND SERVER & API v2.0
echo ===================================================================
echo.
echo Starting backend server on http://localhost:3000 ...
echo.

if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
    start "" http://localhost:3000
    "%APPDATA%\Antigravity\bin\agy-node.cmd" server.js
    goto :end
)

where agy-node >nul 2>&1
if %errorlevel% equ 0 (
    start "" http://localhost:3000
    agy-node server.js
    goto :end
)

where node >nul 2>&1
if %errorlevel% equ 0 (
    start "" http://localhost:3000
    node server.js
    goto :end
)

echo [INFO] agy-node/node not in global PATH, launching via PowerShell HTTP server...
start "" http://localhost:3000
powershell -ExecutionPolicy Bypass -File server.ps1

:end
pause

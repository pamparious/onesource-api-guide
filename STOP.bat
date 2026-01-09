@echo off
setlocal EnableDelayedExpansion
title TR ONESOURCE - Stop Server

echo.
echo ============================================
echo  TR ONESOURCE API Guide - Stop Server
echo ============================================
echo.

echo Searching for running Node.js servers on port 3000...
echo.

REM Find process using port 3000
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    set PID=%%a
    set FOUND=1

    REM Get process name
    for /f "tokens=1" %%b in ('tasklist /FI "PID eq !PID!" /NH') do set PROCESS_NAME=%%b

    echo Found server process: PID !PID!
    echo Process: !PROCESS_NAME! ^(PID: !PID!^)
    echo.

    choice /C YN /M "Do you want to stop this process"
    if !errorlevel! EQU 1 (
        taskkill /F /PID !PID! >nul 2>&1
        if !errorlevel! EQU 0 (
            echo.
            echo [OK] Server stopped successfully!
        ) else (
            echo.
            echo [ERROR] Failed to stop server.
            echo Try closing the server window manually.
        )
    ) else (
        echo.
        echo Server was not stopped.
    )
    goto :done
)

if !FOUND! EQU 0 (
    echo No server found running on port 3000.
    echo The server may already be stopped.
)

:done
echo.
pause

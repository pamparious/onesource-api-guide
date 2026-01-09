@echo off

REM ============================================
REM TR ONESOURCE API Guide - Quick Start Script
REM ============================================

title TR ONESOURCE API Guide - Starting...

echo.
echo ============================================
echo  TR ONESOURCE API Guide - Quick Start
echo ============================================
echo.

REM Step 1: Check if Node.js is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1 && goto node_found
echo.
echo [ERROR] Node.js is NOT installed!
echo.
echo You need Node.js to run this application.
echo.
echo Please install Node.js from: https://nodejs.org/
echo.
echo RECOMMENDED: Download "LTS" version (Long Term Support)
echo              Version 18.x or higher is required
echo.
echo Installation Steps:
echo   1. Visit https://nodejs.org/
echo   2. Download the Windows Installer (.msi)
echo   3. Run installer with default options
echo   4. Restart this script after installation
echo.
pause
exit /b 1

:node_found
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected

REM Step 2: Check npm
echo [2/5] Checking npm (Node Package Manager)...
call npm --version >nul 2>&1 && goto npm_found
echo.
echo [ERROR] npm is NOT installed!
echo.
echo npm should come with Node.js. Please reinstall Node.js.
echo Download from: https://nodejs.org/
echo.
pause
exit /b 1

:npm_found
for /f "tokens=*" %%i in ('call npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% detected

REM Step 3: Check for node_modules folder
echo [3/5] Checking dependencies...
if not exist "node_modules\" goto install_deps
echo [OK] Dependencies already installed
goto deps_done

:install_deps
echo.
echo Dependencies not installed. Installing now...
echo This may take 1-2 minutes on first run...
echo.
call npm install
if errorlevel 1 goto install_failed
echo.
echo [OK] Dependencies installed successfully!
goto deps_done

:install_failed
echo.
echo [ERROR] Failed to install dependencies!
echo.
echo Please check:
echo   - Internet connection is active
echo   - No firewall blocking npm
echo   - You have write permissions in this folder
echo.
echo Try running this command manually:
echo   npm install
echo.
pause
exit /b 1

:deps_done

REM Step 4: Check if port 3000 is already in use
echo [4/5] Checking if port 3000 is available...
netstat -an | find ":3000" | find "LISTENING" >nul 2>&1
if errorlevel 1 goto port_free
echo.
echo [WARNING] Port 3000 is already in use!
echo.
echo Another application is using port 3000.
echo You may already have the server running in another window.
echo.
echo Options:
echo   1. Close the other application using port 3000
echo   2. Use the STOP.bat script to stop any running server
echo   3. Check Task Manager for node.exe processes
echo.
echo To find what's using port 3000, run:
echo   netstat -ano ^| findstr :3000
echo.
choice /C YN /M "Do you want to continue anyway"
if errorlevel 2 goto cancelled
goto port_free

:cancelled
echo.
echo Startup cancelled.
pause
exit /b 1

:port_free
echo [OK] Port 3000 appears to be available

REM Step 5: Start the server
echo [5/5] Starting server...
echo.
echo ============================================
echo  Server is starting...
echo ============================================
echo.
echo The server will start in a moment.
echo Your browser will open automatically.
echo.
echo IMPORTANT: Keep this window open!
echo            The server runs in this window.
echo            To stop the server, press Ctrl+C
echo.
echo Server logs will appear below:
echo ============================================
echo.

REM Start server and open browser
start /b call npm start
timeout /t 3 /nobreak >nul
start http://localhost:3000
timeout /t 1 /nobreak >nul

echo.
echo ============================================
echo  Server is running!
echo ============================================
echo.
echo Browser should open automatically to:
echo   http://localhost:3000
echo.
echo If browser didn't open, manually visit:
echo   http://localhost:3000
echo.
echo Features available:
echo   - Browse API documentation
echo   - Use AI Assistant chatbot
echo   - Partner Onboarding form
echo.
echo TO STOP THE SERVER:
echo   1. Press Ctrl+C in this window
echo   2. Or run the STOP.bat script
echo   3. Or close this window
echo.
echo ============================================
echo.

REM Wait for user input before allowing script to end
pause

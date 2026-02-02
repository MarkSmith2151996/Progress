@echo off
title Progress Tracker
cd /d "C:\Users\Big A\Progress-temp"

echo.
echo ========================================
echo   PROGRESS TRACKER
echo ========================================
echo.

REM Check node
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)

REM Fix corrupted modules
if not exist "node_modules\next\dist\bin\next" (
    echo Fixing node_modules...
    if exist "node_modules" rmdir /s /q node_modules
    npm install
    if errorlevel 1 (
        echo npm install failed!
        pause
        exit /b 1
    )
)

echo Starting server...
echo.
echo   PC:     http://localhost:3000
echo   Mobile: http://localhost:3000/mobile
echo.

REM Open browser after 5 seconds
start "" cmd /c "timeout /t 5 >nul && start http://localhost:3000/mobile"

npm run dev
pause

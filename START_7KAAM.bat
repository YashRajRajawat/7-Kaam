@echo off
setlocal EnableDelayedExpansion
title 7 Kaam Platform - Full Stack Launcher
color 0B
cls

:: ============================================================================
::  7 KAAM PLATFORM - FULL STACK LAUNCHER
::  Starts every service and opens every page. Run this from the repo root.
:: ============================================================================

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set DASHBOARD=%ROOT%dashboard
set WORKER_APP=%ROOT%mobile\flutter_sample_1
set CUSTOMER_APP=%ROOT%mobile\customer_app
set SCRAPER=%ROOT%business_scraper
set TRUST=%ROOT%Video_processing

echo.
echo  ================================================================
echo   7 KAAM PLATFORM - FULL STACK LAUNCHER
echo  ================================================================
echo.

:: ---------------------------------------------------------------------------
::  Locate Flutter. Checked in order, falling back to whatever is on PATH.
:: ---------------------------------------------------------------------------
set FLUTTER=
for %%P in (
  "%USERPROFILE%\OneDrive\Desktop\fluttersdk\flutter\bin\flutter.bat"
  "%USERPROFILE%\Flutter\flutter\bin\flutter.bat"
  "%USERPROFILE%\flutter\bin\flutter.bat"
  "C:\flutter\bin\flutter.bat"
  "C:\src\flutter\bin\flutter.bat"
) do (
  if not defined FLUTTER if exist %%P set FLUTTER=%%~P
)
if not defined FLUTTER (
  where flutter >nul 2>&1 && set FLUTTER=flutter
)

:: ---------------------------------------------------------------------------
::  Preflight - report anything missing instead of failing silently later.
:: ---------------------------------------------------------------------------
echo  Checking prerequisites...
set MISSING=0

where node >nul 2>&1 || (echo    [X] Node.js not found - install from https://nodejs.org & set MISSING=1)
if exist "%BACKEND%\node_modules" (echo    [OK] backend dependencies) else (echo    [!] backend dependencies missing - run: npm install --prefix backend & set MISSING=1)
if exist "%DASHBOARD%\node_modules" (echo    [OK] dashboard dependencies) else (echo    [!] dashboard dependencies missing - run: npm install --prefix dashboard & set MISSING=1)
if exist "%BACKEND%\.env" (echo    [OK] backend .env) else (echo    [!] %BACKEND%\.env missing - copy .env.example and fill it in & set MISSING=1)
if exist "%TRUST%\.venv\Scripts\python.exe" (echo    [OK] trust engine venv) else (echo    [-] trust engine venv missing - it will be skipped)
if exist "%SCRAPER%\venv\Scripts\python.exe" (echo    [OK] scraper venv) else (echo    [-] scraper venv missing - "Collect Data" in the dashboard will fail)
if defined FLUTTER (echo    [OK] flutter: !FLUTTER!) else (echo    [-] flutter not found - the two mobile apps will be skipped)

if "%MISSING%"=="1" (
  echo.
  echo  ================================================================
  echo   Some required pieces are missing ^(marked [X] or [!] above^).
  echo   Fix those first, or press Ctrl+C to abort.
  echo  ================================================================
  pause
)

echo.
echo  Starting services...
echo.

:: ---------------------------------------------------------------------------
::  1. Backend API - http://localhost:8000
:: ---------------------------------------------------------------------------
echo  [1/5]  Backend API          http://localhost:8000
start "7 Kaam - Backend API" cmd /k "color 0A && cd /d "%BACKEND%" && npm run dev"
timeout /t 5 /nobreak >nul

:: ---------------------------------------------------------------------------
::  2. Admin Dashboard - http://localhost:3000
:: ---------------------------------------------------------------------------
echo  [2/5]  Admin Dashboard      http://localhost:3000
start "7 Kaam - Admin Dashboard" cmd /k "color 0E && cd /d "%DASHBOARD%" && npm run dev"
timeout /t 5 /nobreak >nul

:: ---------------------------------------------------------------------------
::  3. AI Trust Engine - http://localhost:8100 (video assessment, optional)
:: ---------------------------------------------------------------------------
if exist "%TRUST%\.venv\Scripts\python.exe" (
  echo  [3/5]  AI Trust Engine      http://localhost:8100
  start "7 Kaam - Trust Engine" cmd /k "color 0D && cd /d "%TRUST%" && .venv\Scripts\python.exe -m uvicorn sevenkaam.api:app --port 8100"
  timeout /t 3 /nobreak >nul
) else (
  echo  [3/5]  AI Trust Engine      SKIPPED ^(no .venv^)
)

:: ---------------------------------------------------------------------------
::  4 + 5. Flutter apps in Chrome (optional - each takes a while to compile)
:: ---------------------------------------------------------------------------
if defined FLUTTER (
  echo  [4/5]  Worker App           opening in Chrome
  start "7 Kaam - Worker App" cmd /k "color 09 && cd /d "%WORKER_APP%" && "!FLUTTER!" run -d chrome"
  timeout /t 3 /nobreak >nul

  echo  [5/5]  Customer App         opening in Chrome
  start "7 Kaam - Customer App" cmd /k "color 0B && cd /d "%CUSTOMER_APP%" && "!FLUTTER!" run -d chrome"
) else (
  echo  [4/5]  Worker App           SKIPPED ^(flutter not found^)
  echo  [5/5]  Customer App         SKIPPED ^(flutter not found^)
)

:: ---------------------------------------------------------------------------
::  Open every page once the servers have had time to boot.
:: ---------------------------------------------------------------------------
echo.
echo  Waiting for servers to finish booting...
timeout /t 12 /nobreak >nul

echo  Opening pages...
start "" "http://localhost:3000/dashboard"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/businesses"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/workers"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8000/health"
if exist "%TRUST%\.venv\Scripts\python.exe" (
  timeout /t 1 /nobreak >nul
  start "" "http://localhost:8100/docs"
)

:: ---------------------------------------------------------------------------
::  Summary
:: ---------------------------------------------------------------------------
echo.
echo  ================================================================
echo   ALL SERVICES LAUNCHED
echo  ================================================================
echo.
echo   Backend API      :  http://localhost:8000
echo   Admin Dashboard  :  http://localhost:3000
echo   AI Trust Engine  :  http://localhost:8100/docs
echo   Worker App       :  Chrome ^(port auto-assigned^)
echo   Customer App     :  Chrome ^(port auto-assigned^)
echo.
echo   Dashboard pages opened:
echo     /dashboard    Overview + scraped business summary
echo     /businesses   Local business directory + "Collect Data"
echo     /workers      Worker directory
echo.
echo  ================================================================
echo   LOGIN CREDENTIALS
echo  ================================================================
echo.
echo   ADMIN DASHBOARD:
echo     Email    : admin@7kaam.in
echo     Password : Admin@7kaam
echo.
echo   WORKER APP (seeded accounts):
echo     Phone: 9876543210  OTP: 1234  (Ravi Kumar - Electrician)
echo     Phone: 9876543211  OTP: 1234  (Sunita Patil - Plumber)
echo     Phone: 9876543212  OTP: 1234  (Mohan Reddy - Carpenter)
echo     Or register with any new number - OTP is always: 1234
echo.
echo   CUSTOMER APP:
echo     Register with any mobile number - OTP is always: 1234
echo.
echo  ================================================================
echo   BUSINESS DATA
echo  ================================================================
echo.
echo   Saved businesses load automatically at startup.
echo   Dashboard ^> Businesses ^> "Collect Data" runs the scraper and new
echo   results appear without restarting anything.
echo.
echo  ================================================================
echo   Close this window anytime. Each service runs independently.
echo  ================================================================
echo.
pause

@echo off
title 7 Kaam Platform Launcher
color 0B
cls

echo.
echo  ================================================================
echo   7 KAAM PLATFORM - FULL STACK LAUNCHER
echo  ================================================================
echo   Starting all services. Each will open in its own window.
echo  ================================================================
echo.

:: ── Paths ──────────────────────────────────────────────────────────────────
set ROOT=%~dp0
if exist "C:\Users\%USERNAME%\Flutter\flutter\bin\flutter.bat" (
    set FLUTTER=C:\Users\%USERNAME%\Flutter\flutter\bin\flutter.bat
) else if exist "C:\Users\Yazor\Flutter\flutter\bin\flutter.bat" (
    set FLUTTER=C:\Users\Yazor\Flutter\flutter\bin\flutter.bat
) else (
    set FLUTTER=flutter
)
set BACKEND=%ROOT%backend
set DASHBOARD=%ROOT%dashboard
set WORKER_APP=%ROOT%user_app\flutter_sample_1
set CUSTOMER_APP=%ROOT%user_app\customer_app

:: ── 1. Backend API (Node.js + Supabase) ────────────────────────────────────
echo  [1/4]  Starting Backend API on http://localhost:8000 ...
start "7 Kaam - Backend API" cmd /k "color 0A && cd /d "%BACKEND%" && npm run dev"
timeout /t 4 /nobreak >nul

:: ── 2. Admin Dashboard (Next.js) ───────────────────────────────────────────
echo  [2/4]  Starting Admin Dashboard on http://localhost:3000 ...
start "7 Kaam - Admin Dashboard" cmd /k "color 0E && cd /d "%DASHBOARD%" && npm run dev"
timeout /t 4 /nobreak >nul

:: ── 3. Worker App (Flutter - Chrome) ───────────────────────────────────────
echo  [3/4]  Starting Worker App in Chrome ...
start "7 Kaam - Worker App" cmd /k "color 0D && cd /d "%WORKER_APP%" && "%FLUTTER%" run -d chrome"
timeout /t 2 /nobreak >nul

:: ── 4. Customer App (Flutter - Chrome) ─────────────────────────────────────
echo  [4/4]  Starting Customer App in Chrome ...
start "7 Kaam - Customer App" cmd /k "color 09 && cd /d "%CUSTOMER_APP%" && "%FLUTTER%" run -d chrome"

:: ── Done ───────────────────────────────────────────────────────────────────
echo.
echo  ================================================================
echo   ALL SERVICES LAUNCHED
echo  ================================================================
echo.
echo   Backend API   :  http://localhost:8000
echo   Admin Panel   :  http://localhost:3000
echo   Worker App    :  Opens in Chrome (port auto-assigned)
echo   Customer App  :  Opens in Chrome (port auto-assigned)
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
echo   Close this window anytime. Each service runs independently.
echo  ================================================================
echo.
pause

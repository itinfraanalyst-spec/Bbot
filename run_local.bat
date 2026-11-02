@echo off
setlocal enabledelayedexpansion
echo ====================================================
echo Starting ChatBot-2 for Local and LAN Access
echo ====================================================

REM Find local IPv4 address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP: =!
    if not "!IP!"=="" (
        set LOCAL_IP=!IP!
    )
)

echo Starting FastAPI Backend (Port 8000 on 0.0.0.0)...
start "ChatBot-2 Backend" cmd /k "python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Vite Frontend (Port 5173 on 0.0.0.0)...
start "ChatBot-2 Frontend" cmd /k "cd client && npm run dev"

echo.
echo ====================================================
echo Services successfully launched!
echo ====================================================
echo Local machine access:
echo   - Frontend (Vite):   http://localhost:5173
echo   - Backend (API):      http://localhost:8000
echo.
if not defined LOCAL_IP goto skip_lan
echo Other devices on your LAN (phone, tablet, laptop):
echo   - Frontend:           http://%LOCAL_IP%:5173
echo   - Backend / Docker:   http://%LOCAL_IP%:8000
echo.
:skip_lan
echo Note: If other devices cannot connect, run fix_lan.bat as Administrator to allow ports 5173 and 8000 in Windows Firewall.
echo ====================================================
echo.
pause

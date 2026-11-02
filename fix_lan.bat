@echo off
echo ====================================================
echo Configuring Windows Firewall for ChatBot LAN Access
echo (Please right-click and select "Run as Administrator")
echo ====================================================
echo.
netsh advfirewall firewall delete rule name="ChatBot LAN" >nul 2>&1
netsh advfirewall firewall add rule name="ChatBot LAN" dir=in action=allow protocol=TCP localport=5173,8000 profile=any
echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Ports 5173 and 8000 are now allowed for LAN incoming connections!
) else (
    echo [WARNING] Administrator privileges required. Right-click fix_lan.bat and choose "Run as Administrator".
)
echo.
pause

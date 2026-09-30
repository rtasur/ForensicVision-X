@echo off
setlocal

REM ============================================================
REM ForensicVision-X - STOP
REM Stops only processes listening on ports 8000 and 5173.
REM ============================================================

echo.
echo [ForensicVision-X] Stopping Backend (port 8000)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo [ForensicVision-X] Stopping Frontend (port 5173)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

REM Also close the two console windows if they were launched by START.cmd.
taskkill /FI "WINDOWTITLE eq ForensicVision-X Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ForensicVision-X Frontend" /T /F >nul 2>&1

echo.
echo ============================================================
echo ForensicVision-X services have been stopped.
echo Ports 8000 and 5173 are clear if no other application uses them.
echo ============================================================
echo.
pause

endlocal

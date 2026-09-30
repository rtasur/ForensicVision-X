@echo off
setlocal

REM ============================================================
REM ForensicVision-X - START
REM Expected structure:
REM   <project-root>\backend\
REM   <project-root>\frontend\
REM ============================================================

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

if not exist "%BACKEND%\main.py" (
    echo [ERROR] Backend not found:
    echo         %BACKEND%\main.py
    pause
    exit /b 1
)

if not exist "%FRONTEND%\package.json" (
    echo [ERROR] Frontend not found:
    echo         %FRONTEND%\package.json
    pause
    exit /b 1
)

if not exist "%BACKEND%\.venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found:
    echo         %BACKEND%\.venv
    echo Create it first with: py -3.14 -m venv .venv
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    pause
    exit /b 1
)

REM Check whether frontend dependencies exist.
if not exist "%FRONTEND%\node_modules" (
    echo [INFO] Frontend dependencies are missing. Running npm install...
    pushd "%FRONTEND%"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    popd
)

REM Start backend in a dedicated window.
start "ForensicVision-X Backend" cmd /k "cd /d "%BACKEND%" && echo [ForensicVision-X Backend] Starting... && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

REM Start frontend in a dedicated window.
start "ForensicVision-X Frontend" cmd /k "cd /d "%FRONTEND%" && echo [ForensicVision-X Frontend] Starting... && npm run dev -- --host localhost --port 5173"

REM Give both services a moment to start.
timeout /t 3 /nobreak >nul

REM Open the application.
start "" "http://localhost:5173"

 echo.
 echo ============================================================
 echo ForensicVision-X is starting.
 echo.
 echo Frontend : http://localhost:5173
 echo Backend  : http://127.0.0.1:8000
 echo Swagger  : http://127.0.0.1:8000/docs
 echo ============================================================
 echo.
 echo Use STOP.cmd to stop the services cleanly.
 echo.
 pause

endlocal

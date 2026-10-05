@echo off
setlocal EnableExtensions EnableDelayedExpansion

title ForensicVision-X - Startup Control
color 0F

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              DIGITAL FORENSICS WORKBENCH
echo ============================================================
echo.
echo   STARTUP CONTROL
echo.
echo   [1] Start with Docker        (Recommended)
echo   [2] Start Local Development
echo   [3] Exit
echo.

choice /C 123 /N /M "Select an option: "

if errorlevel 3 goto :END
if errorlevel 2 goto :LOCAL
if errorlevel 1 goto :DOCKER


:DOCKER
cls

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              DOCKER STARTUP
echo ============================================================
echo.

echo [1/5] Checking Docker installation...

where docker >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Docker was not found.
    echo.
    echo Please install Docker Desktop and try again.
    echo.
    pause
    goto :END
)

echo       Docker executable found.
echo.

echo [2/5] Checking Docker Engine...

docker info >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Docker Engine is not running.
    echo.
    echo Please start Docker Desktop first.
    echo.
    echo After Docker Desktop shows "Running",
    echo execute START.cmd again.
    echo.
    pause
    goto :END
)

echo       Docker Engine is running.
echo.

echo [3/5] Checking Docker Compose...

docker compose version >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Docker Compose is unavailable.
    echo.
    echo Your Docker Desktop installation may be outdated.
    echo.
    pause
    goto :END
)

echo       Docker Compose available.
echo.

echo [4/5] Locating project...

if exist "%~dp0docker-compose.yml" (
    set "COMPOSE_FILE=%~dp0docker-compose.yml"
    goto :COMPOSE_FOUND
)

if exist "%~dp0compose.yml" (
    set "COMPOSE_FILE=%~dp0compose.yml"
    goto :COMPOSE_FOUND
)

echo.
echo [ERROR] Docker Compose file not found.
echo.
echo Expected one of:
echo.
echo   docker-compose.yml
echo   compose.yml
echo.
pause
goto :END


:COMPOSE_FOUND

cd /d "%~dp0"

echo       Project root:
echo       %CD%
echo.

echo [5/5] Building and starting ForensicVision-X...
echo.
echo ------------------------------------------------------------
echo Docker Compose
echo ------------------------------------------------------------
echo.

docker compose -f "%COMPOSE_FILE%" up -d --build

if errorlevel 1 (
    echo.
    echo ============================================================
    echo [ERROR] Docker startup failed.
    echo ============================================================
    echo.
    echo Check the Docker output above.
    echo.
    pause
    goto :END
)

echo.
echo ============================================================
echo              FORENSICVISION-X IS RUNNING
echo ============================================================
echo.

echo Container status:
echo.

docker compose -f "%COMPOSE_FILE%" ps

echo.
echo ------------------------------------------------------------
echo Web Application
echo ------------------------------------------------------------
echo.
echo   http://localhost:5173
echo.
echo ------------------------------------------------------------
echo Backend API
echo ------------------------------------------------------------
echo.
echo   http://localhost:8000
echo.
echo ------------------------------------------------------------
echo.
echo Opening ForensicVision-X...
echo.

timeout /t 3 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo Application started successfully.
echo.
echo Use STOP.cmd to shut down the Docker services.
echo.
pause
goto :END


:LOCAL

cls

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              LOCAL DEVELOPMENT MODE
echo ============================================================
echo.

echo [WARNING]
echo Local development mode is intended for developers.
echo.
echo For SIH demonstrations and judges, Docker mode is recommended.
echo.
echo.

if not exist "%~dp0frontend\package.json" (
    echo [ERROR] frontend directory not found.
    pause
    goto :END
)

if not exist "%~dp0backend" (
    echo [ERROR] backend directory not found.
    pause
    goto :END
)

cd /d "%~dp0"

echo Starting local frontend/backend services...
echo.
echo This mode assumes your local Python and Node environments
echo are already configured.
echo.

start "ForensicVision-X Backend" cmd /k ^
"cd /d "%~dp0backend" && if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

start "ForensicVision-X Frontend" cmd /k ^
"cd /d "%~dp0frontend" && npm run dev"

timeout /t 5 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo Local development services started.
echo.
echo Frontend:
echo   http://localhost:5173
echo.
echo Backend:
echo   http://localhost:8000
echo.
pause
goto :END


:END

echo.
echo ForensicVision-X startup control closed.
echo.

endlocal
exit /b 0
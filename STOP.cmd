@echo off
setlocal EnableExtensions EnableDelayedExpansion

title ForensicVision-X - Shutdown Control
color 0F

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              DIGITAL FORENSICS WORKBENCH
echo ============================================================
echo.
echo   SHUTDOWN CONTROL
echo.
echo   [1] Stop Docker Services
echo   [2] Stop Local Development Services
echo   [3] Stop Everything
echo   [4] Exit
echo.

choice /C 1234 /N /M "Select an option: "

if errorlevel 4 goto :END
if errorlevel 3 goto :EVERYTHING
if errorlevel 2 goto :LOCAL
if errorlevel 1 goto :DOCKER


:DOCKER

cls

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              DOCKER SHUTDOWN
echo ============================================================
echo.

where docker >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Docker was not found.
    echo.
    pause
    goto :END
)

docker info >nul 2>&1

if errorlevel 1 (
    echo [INFO] Docker Engine is not running.
    echo Nothing to stop.
    echo.
    pause
    goto :END
)

cd /d "%~dp0"

if exist "%~dp0docker-compose.yml" (
    set "COMPOSE_FILE=%~dp0docker-compose.yml"
    goto :DOCKER_STOP
)

if exist "%~dp0compose.yml" (
    set "COMPOSE_FILE=%~dp0compose.yml"
    goto :DOCKER_STOP
)

echo [ERROR] Docker Compose file not found.
echo.
pause
goto :END


:DOCKER_STOP

echo Stopping Docker services...
echo.

docker compose -f "%COMPOSE_FILE%" down

if errorlevel 1 (
    echo.
    echo [ERROR] Docker shutdown encountered an error.
    echo.
    pause
    goto :END
)

echo.
echo ============================================================
echo              DOCKER SERVICES STOPPED
echo ============================================================
echo.
echo PostgreSQL, backend and frontend containers have been
echo stopped.
echo.
pause
goto :END


:LOCAL

cls

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              LOCAL SHUTDOWN
echo ============================================================
echo.

echo Searching for local ForensicVision-X processes...
echo.

taskkill /FI "WINDOWTITLE eq ForensicVision-X Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ForensicVision-X Frontend*" /T /F >nul 2>&1

echo Local development processes stopped.
echo.

pause
goto :END


:EVERYTHING

cls

echo.
echo ============================================================
echo              FORENSICVISION-X
echo              COMPLETE SHUTDOWN
echo ============================================================
echo.

echo [1/2] Stopping Docker services...
echo.

where docker >nul 2>&1

if not errorlevel 1 (

    docker info >nul 2>&1

    if not errorlevel 1 (

        cd /d "%~dp0"

        if exist "%~dp0docker-compose.yml" (
            docker compose -f "%~dp0docker-compose.yml" down
        ) else if exist "%~dp0compose.yml" (
            docker compose -f "%~dp0compose.yml" down
        )

    )
)

echo.
echo [2/2] Stopping local development services...
echo.

taskkill /FI "WINDOWTITLE eq ForensicVision-X Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ForensicVision-X Frontend*" /T /F >nul 2>&1

echo.
echo ============================================================
echo              FORENSICVISION-X STOPPED
echo ============================================================
echo.
echo Docker services and local development processes have been
echo stopped where applicable.
echo.

pause
goto :END


:END

echo.
echo ForensicVision-X shutdown control closed.
echo.

endlocal
exit /b 0
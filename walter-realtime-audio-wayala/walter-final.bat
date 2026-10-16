@REM @echo off

@REM REM Entrar a la carpeta del proyecto
@REM cd /d "C:\Users\enriq\Downloads\Waltersito2\walter-realtime-audio-wayala"

@REM title Iniciando Walter

@REM echo ==========================================
@REM echo          INICIANDO WALTER
@REM echo ==========================================
@REM echo.

@REM REM Iniciar Next.js y la API en otra terminal
@REM start "Walter - Next.js y API" cmd /k "npm run dev"

@REM REM Espera breve. Electron también esperará internamente
@REM REM hasta que localhost:3000 esté disponible.
@REM timeout /t 2 /nobreak >nul

@REM REM Iniciar Electron utilizando la instalación local
@REM start "Walter - Electron" cmd /k ".\node_modules\.bin\electron.cmd electron\main.cjs"

@REM REM Cerrar únicamente esta ventana inicial del BAT
@REM exit /b
@echo off
cd /d "%~dp0"

REM Iniciar Next.js y la API en otra terminal
start "Walter - Next.js y API" cmd /k "npm run dev"

REM Electron espera internamente hasta que Next.js esté listo
timeout /t 2 /nobreak >nul

REM Iniciar Electron utilizando la instalación local
start "Walter - Electron" cmd /k ".\node_modules\.bin\electron.cmd electron\main.cjs"

REM Cerrar únicamente esta ventana inicial del BAT
exit /b
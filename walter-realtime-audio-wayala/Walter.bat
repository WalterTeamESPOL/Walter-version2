@echo off
setlocal

title Walter - Iniciador

REM Entrar a la carpeta donde se encuentra este BAT
cd /d "%~dp0"

echo ==========================================
echo          INICIANDO WALTER
echo ==========================================
echo.
echo Carpeta actual:
echo %CD%
echo.

REM ------------------------------------------------------
REM VERIFICACIONES
REM ------------------------------------------------------

if not exist "package.json" (
    echo ERROR: No se encontro package.json.
    echo.
    echo Este BAT debe estar en la raiz del proyecto.
    pause
    exit /b 1
)

if not exist "electron\main.cjs" (
    echo ERROR: No se encontro electron\main.cjs.
    echo.
    echo Debes tener:
    echo %CD%\electron\main.cjs
    pause
    exit /b 1
)

if not exist "public\display_walter.html" (
    echo ERROR: No se encontro public\display_walter.html.
    echo.
    echo Debes tener:
    echo %CD%\public\display_walter.html
    pause
    exit /b 1
)

where npm >nul 2>&1

if errorlevel 1 (
    echo ERROR: Windows no encuentra npm.
    echo Revisa la instalacion de Node.js.
    pause
    exit /b 1
)

echo Archivos encontrados correctamente.
echo.

REM ------------------------------------------------------
REM INICIAR NEXT.JS
REM ------------------------------------------------------

echo Abriendo servidor Next.js...

start "Walter - Servidor Next.js" cmd /k ^
"cd /d ""%~dp0"" && echo Carpeta: %%CD%% && npm run dev"

echo.
echo Esperando que localhost:3000 responda...

REM Esperar hasta 60 segundos
set "SERVIDOR_LISTO=0"

for /L %%i in (1,1,60) do (
    curl.exe -s -o nul -w "%%{http_code}" http://localhost:3000/ 2>nul | findstr /R "200 301 302 307 308" >nul

    if not errorlevel 1 (
        set "SERVIDOR_LISTO=1"
        goto servidor_listo
    )

    timeout /t 1 /nobreak >nul
)

:servidor_listo

if "%SERVIDOR_LISTO%"=="0" (
    echo.
    echo ERROR: Next.js no respondio en localhost:3000.
    echo.
    echo Revisa la terminal:
    echo Walter - Servidor Next.js
    echo.
    pause
    exit /b 1
)

echo.
echo Next.js ya esta funcionando.
echo.

REM ------------------------------------------------------
REM ABRIR PANEL PRINCIPAL
REM ------------------------------------------------------

echo Abriendo panel principal...

start "" "http://localhost:3000"

timeout /t 2 /nobreak >nul

REM ------------------------------------------------------
REM INICIAR ELECTRON
REM ------------------------------------------------------

echo Iniciando Electron...

start "Walter - Electron" cmd /k ^
"cd /d ""%~dp0"" && echo Carpeta: %%CD%% && npx electron electron\main.cjs"

echo.
echo ==========================================
echo Walter fue enviado a iniciar.
echo ==========================================
echo.
echo Se deben haber abierto:
echo 1. Una terminal para Next.js.
echo 2. El panel en el navegador.
echo 3. Una terminal para Electron.
echo 4. El display en pantalla completa.
echo.
echo No cierres esta ventana hasta comprobarlo.
pause

endlocal
@REM @echo off

@REM cd /d "C:\Users\enriq\Downloads\Waltersito2\walter-realtime-audio-wayala"

@REM REM Servidor principal de Walter: voz, expresiones y display
@REM start "Walter principal" cmd /k "npm run dev"

@REM REM Servidor independiente para el movimiento de cabeza
@REM start "Cabeza Walter" cmd /k "node serverprueba.js"

@REM REM Esperar a que ambos servidores se inicien
@REM timeout /t 7 /nobreak >nul

@REM REM Abrir solamente el display principal
@REM start "" chrome.exe --kiosk http://localhost:3000/display_walter.html

@REM pause

@echo off 

cd /d C:\Users\enriq\Downloads\Waltersito2\walter-realtime-audio-wayala 

start cmd /k "npm run dev" 

timeout /t 5
start "" chrome.exe http://localhost:3000 
//start "" chrome.exe --start-fullscreen http://localhost:3000/display_walter.html 
start "" chrome.exe --kiosk http://localhost:3000/display_walter.html 

pause
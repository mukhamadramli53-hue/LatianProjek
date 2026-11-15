@echo off
setlocal
title Sistem Pelayanan Desa - Laragon Dev Server
color 0A

echo ================================================================
echo          SISTEM PELAYANAN DESA DIGITAL (LARAGON)
echo      Next.js 16 ^| React 19 ^| Auth.js ^| Prisma ^| MySQL
echo ================================================================
echo.

cd /d "%~dp0pelayanan-desa"
if not exist "package.json" goto ERR_NO_PROJ

where node >nul 2>&1
if errorlevel 1 goto ERR_NO_NODE

where npm >nul 2>&1
if errorlevel 1 goto ERR_NO_NPM

if not exist "node_modules\" (
    echo [INFO] Menyiapkan dependensi node_modules...
    call npm install
)

if not exist ".env.local" (
    if exist ".env" (
        copy .env .env.local >nul
    )
)

:: Periksa port 3000 dengan PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto ALREADY_RUNNING

:: Tentukan mode eksekusi
set APP_MODE=dev
if /i "%~1"=="prod" set APP_MODE=prod
if /i "%~1"=="--prod" set APP_MODE=prod

echo [MODE] Mode eksekusi: %APP_MODE%
echo [INFO] Menjalankan pemantau kesiapan browser...
echo.

:: Auto-opener saat server siap
start "" /B powershell -NoProfile -ExecutionPolicy Bypass -Command "$max = 45; $ok = $false; for ($i = 1; $i -le $max; $i++) { Start-Sleep -Seconds 1; try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok = $true; break; } } catch {} }; if ($ok) { Start-Process 'http://LatihanProjek.test'; }"

if "%APP_MODE%"=="prod" goto RUN_PROD

:RUN_DEV
echo [DEV] Menjalankan Next.js server (npm run dev)...
call npm run dev
goto END

:RUN_PROD
echo [PROD] Membangun bundel produksi (npm run build)...
call npm run build
if errorlevel 1 goto ERR_BUILD
echo [PROD] Menjalankan server produksi (npm run start)...
call npm run start
goto END

:ALREADY_RUNNING
echo ================================================================
echo [OK] Server Next.js sudah aktif dan merespons di port 3000!
echo Membuka aplikasi di browser: http://LatihanProjek.test
echo ================================================================
start "" "http://LatihanProjek.test"
echo.
ping -n 3 127.0.0.1 >nul
exit /b 0

:ERR_NO_PROJ
color 0C
echo [ERROR] Folder pelayanan-desa atau package.json tidak ditemukan!
pause
exit /b 1

:ERR_NO_NODE
color 0C
echo [ERROR] Node.js tidak ditemukan di PATH sistem.
pause
exit /b 1

:ERR_NO_NPM
color 0C
echo [ERROR] npm tidak ditemukan di PATH sistem.
pause
exit /b 1

:ERR_BUILD
color 0C
echo [ERROR] Build produksi gagal.
pause
exit /b 1

:END
echo.
echo Server telah berhenti.
pause

@echo off
title SmartNexus - Seed + API
color 0A

echo.
echo =====================================================
echo   SmartNexus - Seed + API Baslat
echo =====================================================
echo.

echo [1/3] Eski node surecleri durduruluyor...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo     OK

echo.
echo [2/3] Demo veriler yukleniyor (argon2)...
cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"
call "C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\ts-node.cmd" ^
  --project "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\tsconfig.json" ^
  "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\prisma\seed.ts"
if %errorlevel% neq 0 (
    echo     [UYARI] Seed basarisiz - PostgreSQL/Docker calismiyor olabilir
    echo     Devam ediliyor...
) else (
    echo     OK - Demo veriler yuklendi
)

echo.
echo [3/3] API sunucusu baslatiliyor (port 3001)...
echo     Derleme basliyor, 30-60 saniye bekleyin...
start "SmartNexus API (3001)" cmd /k "cd /d C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api && C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\nest.cmd start --watch"

echo.
echo =====================================================
echo   "Nest application successfully started" yazisini
echo   gordugunuzde giris yapabilirsiniz:
echo   http://localhost:3000
echo   admin@smartnexus.com / SmartNexus2026!
echo =====================================================
echo.
pause

@echo off
title SmartNexus - Fix ve Baslat

echo [0] Eski node surecleri durduruluyor...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1] Seed verisi yeniden yukleniyor (argon2 ile)...
cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"
call "C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\ts-node" prisma/seed.ts
if %errorlevel% neq 0 (
    echo [UYARI] Seed hata verdi ama devam ediliyor...
) else (
    echo [OK] Seed tamamlandi.
)

echo.
echo [2] API Sunucusu baslatiliyor (port 3001)...
start "API Server (3001)" cmd /k "cd /d C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api && C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\nest start --watch"

echo [3] 15 saniye bekleniyor...
timeout /t 15 /nobreak >nul

echo.
echo ============================================
echo   Sistem hazir!
echo   Web : http://localhost:3000
echo   API : http://localhost:3001/api
echo   admin@smartnexus.com / SmartNexus2026!
echo ============================================
echo.
pause

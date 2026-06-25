@echo off
title SmartNexus - Baslatma Merkezi
cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP"

echo.
echo ============================================
echo   SmartNexus ERP  -  Baslatma Scripti
echo ============================================
echo.

:: Node.js kontrol
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js bulunamadi! nodejs.org dan indirin.
    pause & exit /b 1
)
for /f %%v in ('node --version') do echo [OK] Node.js: %%v

:: npm kontrol
for /f %%v in ('npm --version') do echo [OK] npm: %%v

:: Docker kontrol
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Docker bulunamadi! Docker Desktop acik mi?
    pause & exit /b 1
)
echo [OK] Docker mevcut.

echo.
echo [1/5] Bagimliliklar kontrol ediliyor...
if not exist "node_modules" (
    echo       Yukleniyor... (ilk kurulum 2-3 dk surebilir)
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] npm install basarisiz!
        pause & exit /b 1
    )
) else (
    echo       node_modules zaten var, atlanıyor.
)

echo.
echo [2/5] Docker ile veritabani baslatiliyor...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [HATA] Docker baslatma basarisiz!
    pause & exit /b 1
)
echo [OK] PostgreSQL + Redis basladi.

echo.
echo [3/5] Veritabani hazir olana kadar bekleniyor (15sn)...
timeout /t 15 /nobreak

echo.
echo [4/5] Prisma migration calistiriliyor...
cd "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"
call npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo       migrate deploy olmadi, dev deneniyor...
    call npx prisma migrate dev --name init
)
echo [OK] Migration tamamlandi.

echo.
echo [5/5] Demo verisi yukleniyor...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo [UYARI] Seed zaten yuklu olabilir, devam ediliyor.
)

cd "C:\Users\w11\Desktop\PROJELER\SmartERP"

echo.
echo [0] Eski Node surecleri temizleniyor...
taskkill /F /IM node.exe >nul 2>&1
echo [OK] Portlar temizlendi.
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   SUNUCULAR BASLATILIYOR
echo ============================================
echo   Web : http://localhost:3000
echo   API : http://localhost:3001/api
echo   Docs: http://localhost:3001/api/docs
echo   ----
echo   Admin: admin@smartnexus.com / SmartNexus2026!
echo ============================================
echo.

start "API Server (3001)" cmd /k "cd /d C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api && npm run dev"
timeout /t 8 /nobreak >nul
start "Web Server (3000)" cmd /k "cd /d C:\Users\w11\Desktop\PROJELER\SmartERP\apps\web && npm run dev"

echo.
echo Sunucular arkaplanda baslatildi.
echo Tarayici 35 saniye sonra otomatik acilacak...
timeout /t 35 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo Bu pencereyi kapatabilirsiniz.
pause

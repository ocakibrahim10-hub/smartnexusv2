@echo off
title SmartNexus - Temiz Baslangic
color 0A

echo.
echo  ====================================================
echo    SmartNexus - Temiz Baslangic (Fix + Seed + API)
echo  ====================================================
echo.

echo [1/6] Node surecleri durduruluyor...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo     OK - Tum node surecleri durduruldu.

echo.
echo [2/6] Eski dist/ klasoru siliniyor...
if exist "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\dist" (
    rd /s /q "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\dist"
    echo     OK - dist/ silindi. Temiz derleme yapilacak.
) else (
    echo     dist/ zaten yok, devam ediliyor.
)
if exist "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\tsconfig.tsbuildinfo" (
    del /f "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\tsconfig.tsbuildinfo"
)

echo.
echo [3/6] Prisma client uretiliyor (TenantType, InvoiceType vs)...
cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"
"C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\prisma" generate --schema=prisma/schema.prisma
if %errorlevel% neq 0 (
    echo     [HATA] Prisma generate basarisiz!
    echo     Docker veya network sorunu olabilir.
    pause
    exit /b 1
) else (
    echo     OK - Prisma client uretildi!
)

echo.
echo [4/6] Demo verileri yukleniyor (argon2 sifreleme)...
"C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\ts-node" ^
  --project "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\tsconfig.json" ^
  "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\prisma\seed.ts"
if %errorlevel% neq 0 (
    echo     [UYARI] Seed hata verdi - PostgreSQL calismiyor olabilir.
    echo     Docker Desktop'u acin ve tekrar deneyin.
) else (
    echo     OK - Demo veriler yuklendi!
)

echo.
echo [5/6] Mevcut dist surumlerini guncelliyoruz...
echo     (nest start --watch otomatik derleyecek)

echo.
echo [6/6] API sunucusu baslatiliyor (port 3001)...
echo     TypeScript derleniyor, lutfen bekleyin...
echo.
start "SmartNexus API (3001)" cmd /k "cd /d C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api && C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\nest start --watch"

echo.
echo  ================================================================
echo   API penceresi "Nest application successfully started" yazisini
echo   gordugunuzde asagidaki bilgilerle giris yapabilirsiniz:
echo  ----------------------------------------------------------------
echo   Web     : http://localhost:3000
echo   API     : http://localhost:3001/api
echo  ----------------------------------------------------------------
echo   DEMO HESAPLAR:
echo   admin@smartnexus.com     / SmartNexus2026!
echo   bayi@smartnexus.com      / Bayi2026!
echo   isletme@smartnexus.com   / Isletme2026!
echo  ================================================================
echo.
pause

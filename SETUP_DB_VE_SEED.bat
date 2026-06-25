@echo off
title SmartNexus - DB Kurulum + Seed
color 0A

echo.
echo  ====================================================
echo    SmartNexus - Veritabani + Demo Veri Kurulumu
echo  ====================================================
echo.
echo  ONKOSUL: Docker Desktop acik ve PostgreSQL caliyor olmali.
echo.

cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"

echo [1/3] Veritabani tablolari olusturuluyor (prisma db push)...
call "C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\prisma.cmd" db push --schema=prisma/schema.prisma --accept-data-loss
if %errorlevel% neq 0 (
    echo  [HATA] prisma db push basarisiz! Docker calisiyor mu?
    pause & exit /b 1
)
echo     OK - Tablolar olusturuldu / guncellendi!

echo.
echo [2/3] Demo veriler yukleniyor (seed)...
call "C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\ts-node.cmd" ^
  --project "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\tsconfig.json" ^
  "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\prisma\seed.ts"
if %errorlevel% neq 0 (
    echo  [HATA] Seed basarisiz!
    pause & exit /b 1
)
echo     OK - Demo veriler yuklendi!

echo.
echo  ====================================================
echo   KURULUM TAMAMLANDI!
echo  ====================================================
echo.
echo   Web  : http://localhost:3000
echo   API  : http://localhost:3001/api
echo.
echo   DEMO HESAPLAR:
echo   admin@smartnexus.com   /  SmartNexus2026!   (SuperAdmin)
echo   bayi@demo.com          /  Bayi2026!          (Bayi)
echo   isletme@demo.com       /  Isletme2026!       (Isletme - PRO)
echo   ofis@demo.com          /  Isletme2026!       (Isletme - BASIC)
echo   sube@demo.com          /  Sube2026!           (Sube)
echo  ====================================================
echo.
pause

@echo off
title SmartNexus - Sifre Duzelt
color 0E

echo.
echo  =====================================================
echo    SmartNexus - Demo Sifre Duzeltme
echo  =====================================================
echo.
echo  Bu script demo kullanici sifrelerini yeniden olusturur.
echo  argon2 ile dogru hash uretilecek.
echo.

cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"

call "C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\ts-node.cmd" ^
  --project "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\tsconfig.json" ^
  "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api\prisma\fix-passwords.ts"

if %errorlevel% neq 0 (
    echo.
    echo  [HATA] Script basarisiz oldu!
    echo  Docker/PostgreSQL calismiyor olabilir.
) else (
    echo.
    echo  =====================================================
    echo   Artik giris yapabilirsiniz:
    echo   http://localhost:3000
    echo  =====================================================
)

echo.
pause

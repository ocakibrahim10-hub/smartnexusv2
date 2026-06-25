@echo off
title Prisma Generate
color 0E
echo.
echo [Prisma Generate] Calistiriliyor...
echo.
cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP\apps\api"

call "C:\Users\w11\Desktop\PROJELER\SmartERP\node_modules\.bin\prisma.cmd" generate --schema=prisma/schema.prisma

if %errorlevel% neq 0 (
    echo.
    echo [HATA] Prisma generate basarisiz!
    echo Yukaridaki hataya bakin.
) else (
    echo.
    echo [BASARILI] Prisma client uretildi!
    echo Simdi API'yi baslatabilirsiniz.
)
echo.
pause

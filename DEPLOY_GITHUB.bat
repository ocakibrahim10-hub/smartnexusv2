@echo off
title SmartNexus - GitHub'a Yukle
color 0B
echo.
echo  ============================================================
echo    SmartNexus - GitHub'a ilk yuklem (git init + push)
echo  ============================================================
echo.
echo  Bu script'i calistirmadan once:
echo  1) github.com'da yeni bir repo olustur (orn: smartnexus-erp)
echo  2) Asagida GITHUB_URL'yi kendi repo URL'nle degistir
echo  ============================================================
echo.

set GITHUB_URL=https://github.com/KULLANICI_ADI/smartnexus-erp.git

cd /d "C:\Users\w11\Desktop\PROJELER\SmartERP"

echo [1/5] Git baslatiliyor...
git init
git config user.email "ocak.ibrahim10@gmail.com"
git config user.name "MYSIACORP"

echo.
echo [2/5] Branch main'e cekiliyor...
git checkout -b main 2>nul || git checkout main

echo.
echo [3/5] Dosyalar ekleniyor...
git add -A

echo.
echo [4/5] Ilk commit...
git commit -m "feat: SmartNexus ERP v1.0 - ilk commit"

echo.
echo [5/5] GitHub'a push ediliyor...
git remote add origin %GITHUB_URL%
git push -u origin main

echo.
echo  ============================================================
echo   GITHUB'A YUKLENDI!
echo   Simdi Railway ve Vercel deploy adimlarini izleyin.
echo  ============================================================
echo.
pause

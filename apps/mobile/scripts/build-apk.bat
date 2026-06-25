@echo off
REM SmartNexus Player v2 — Release APK derleme (Windows)
REM Gereksinim: Android SDK, JDK 17+, uzun yol destegi acik olmali

set GRADLE_USER_HOME=C:\gcache
cd /d "%~dp0"

echo [1/3] Bagimliliklar...
call npm install
if errorlevel 1 exit /b 1

echo [2/3] Android native proje...
call npx expo prebuild --platform android --no-install
if errorlevel 1 exit /b 1

echo [3/3] Release APK...
cd android
call gradlew.bat assembleRelease
if errorlevel 1 exit /b 1

echo.
echo APK hazir:
echo   android\app\build\outputs\apk\release\app-release.apk
pause

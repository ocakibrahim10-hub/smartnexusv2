@echo off
echo SmartERP Mobil Uygulama (APK) Olusturuluyor...

cd apps\mobile
call npx expo prebuild --platform android

cd android
call .\gradlew assembleRelease

echo Islem tamamlandi, dosya kopyalaniyor...
copy /Y "app\build\outputs\apk\release\app-release.apk" "..\..\..\gerekli programlar\SmartNexus_Player_v2.apk"
if exist "..\..\dist\smartnexus-player-v2.apk" copy /Y "..\..\dist\smartnexus-player-v2.apk" "..\..\..\gerekli programlar\SmartNexus_Player_v2.apk"

echo Islem basariyla gerceklesti. Lutfen 'gerekli programlar' klasorunu kontrol edin.
pause

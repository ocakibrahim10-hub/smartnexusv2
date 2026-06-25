@echo off
echo SmartERP Mobil Uygulama (APK) Olusturuluyor...

cd apps\mobile
call npx expo prebuild --platform android

cd android
call .\gradlew assembleRelease

echo Islem tamamlandi, dosya kopyalaniyor...
copy /Y "app\build\outputs\apk\release\app-release.apk" "..\..\..\gerekli programlar\SmartERP_Mobile.apk"

echo Islem basariyla gerceklesti. Lutfen 'gerekli programlar' klasorunu kontrol edin.
pause

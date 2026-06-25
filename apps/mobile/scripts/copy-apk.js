const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const destDir = path.join(__dirname, '..', 'dist');
const dest = path.join(destDir, 'smartnexus-player-v2.apk');

if (!fs.existsSync(src)) {
  console.error('APK bulunamadı. Önce gradlew assembleRelease çalıştırın.');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
console.log(`APK kopyalandı: ${dest} (${mb} MB)`);

const programDir = path.join(__dirname, '..', '..', '..', 'gerekli programlar');
fs.mkdirSync(programDir, { recursive: true });
const programApk = path.join(programDir, 'SmartNexus_Player_v2.apk');
fs.copyFileSync(src, programApk);
console.log(`APK kopyalandı: ${programApk}`);

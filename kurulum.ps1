# SmartNexus — Otomatik Kurulum Scripti (PowerShell)
# Çalıştır: sağ tık > PowerShell ile çalıştır VEYA: .\kurulum.ps1

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         SmartNexus Kurulum Scripti           ║" -ForegroundColor Cyan
Write-Host "║         ERP · WMS · TMS · B2B SaaS           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = $PSScriptRoot

# Node.js kontrolü
try { $nodeVersion = node --version } catch { Write-Host "❌ Node.js bulunamadı! https://nodejs.org adresinden yükleyin." -ForegroundColor Red; exit 1 }
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# npm kontrolü
$npmVersion = npm --version
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green

# Docker kontrolü
try { $dockerVersion = docker --version } catch { Write-Host "⚠️  Docker bulunamadı. PostgreSQL için gerekli." -ForegroundColor Yellow }
if ($dockerVersion) { Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green }

Write-Host ""
Write-Host "📦 Bağımlılıklar yükleniyor..." -ForegroundColor Yellow

# Root deps
Set-Location $ProjectDir
npm install

# API deps
Set-Location "$ProjectDir\apps\api"
Write-Host "🔧 API bağımlılıkları..." -ForegroundColor Yellow
npm install

# Web deps
Set-Location "$ProjectDir\apps\web"
Write-Host "🎨 Web bağımlılıkları..." -ForegroundColor Yellow
npm install

Set-Location $ProjectDir

Write-Host ""
Write-Host "🐳 Docker ile veritabanı başlatılıyor..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "⏳ Veritabanı hazır olana kadar bekleniyor (10sn)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🗄️  Prisma migration çalıştırılıyor..." -ForegroundColor Yellow
Set-Location "$ProjectDir\apps\api"
npx prisma migrate dev --name faz3_wms
npx prisma db seed

Set-Location $ProjectDir

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           ✅ Kurulum Tamamlandı!             ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Başlatmak için:  npm run dev                ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  Web:     http://localhost:3000              ║" -ForegroundColor Green
Write-Host "║  API:     http://localhost:3001/api          ║" -ForegroundColor Green
Write-Host "║  Swagger: http://localhost:3001/api/docs     ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  SuperAdmin: admin@smartnexus.com            ║" -ForegroundColor Green
Write-Host "║  Şifre:      SmartNexus2026!                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$start = Read-Host "Projeyi şimdi başlatmak ister misiniz? (E/H)"
if ($start -eq "E" -or $start -eq "e") {
    npm run dev
}

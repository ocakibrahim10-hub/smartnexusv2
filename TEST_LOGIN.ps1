$body = '{"email":"admin@smartnexus.com","password":"SmartNexus2026!"}'
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    Write-Host ""
    Write-Host "✅ GİRİŞ BAŞARILI!" -ForegroundColor Green
    Write-Host "Status: $($r.StatusCode)" -ForegroundColor Green
    $json = $r.Content | ConvertFrom-Json
    Write-Host "Kullanıcı: $($json.user.name)" -ForegroundColor Cyan
    Write-Host "Rol: $($json.user.role)" -ForegroundColor Cyan
    Write-Host "Tenant: $($json.user.tenantName)" -ForegroundColor Cyan
    Write-Host "Token: $($json.accessToken.Substring(0,40))..." -ForegroundColor DarkGray
} catch {
    Write-Host ""
    Write-Host "❌ GİRİŞ BAŞARISIZ!" -ForegroundColor Red
    Write-Host "Hata: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Detay: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
Write-Host ""
Write-Host "Devam etmek için bir tuşa basın..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

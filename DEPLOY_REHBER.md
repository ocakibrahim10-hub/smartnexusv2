# SmartNexus — Canlı Ortam Deploy Rehberi

## Mimari

```
[Vercel] Next.js Web  →  [Railway] NestJS API  →  [Neon] PostgreSQL
```

---

## ADIM 1 — Neon Database (Ücretsiz PostgreSQL)

1. https://neon.tech adresine git → Sign up (GitHub ile)
2. **New Project** → İsim: `smartnexus`
3. Region: **Europe (Frankfurt)** seç
4. Oluşturulduktan sonra **Connection String** kopyala:
   ```
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Bu URL'yi not al → Railway ve `.env.production` için lazım

---

## ADIM 2 — GitHub'a Yükle

1. https://github.com → **New Repository**
2. İsim: `smartnexus-erp` → Public veya Private → **Create**
3. **Repo URL'yi kopyala** (örn: `https://github.com/ocak-ibrahim/smartnexus-erp.git`)
4. `DEPLOY_GITHUB.bat` dosyasını aç, içindeki `GITHUB_URL` satırını kendi URL'nle değiştir
5. `DEPLOY_GITHUB.bat` çalıştır → kod GitHub'a gider

---

## ADIM 3 — Railway (NestJS API)

1. https://railway.app → **New Project** → **Deploy from GitHub**
2. SmartNexus reposunu seç
3. **Add Variables** (Environment Variables):
   ```
   DATABASE_URL        = (Neon'dan aldığın URL)
   JWT_SECRET          = smartnexus-jwt-secret-2026-production-gizli
   JWT_REFRESH_SECRET  = smartnexus-refresh-secret-2026-gizli
   JWT_EXPIRES_IN      = 7d
   JWT_REFRESH_EXPIRES_IN = 30d
   API_PREFIX          = api
   NODE_ENV            = production
   FRONTEND_URL        = https://smartnexus-erp.vercel.app
   ```
4. **Deploy** → Birkaç dakika bekle
5. **Settings → Networking → Generate Domain** tıkla
   → URL: `https://smartnexus-xxx.railway.app` — NOT AL

### API'yi Seed Et (veritabanına demo verileri yükle):

Railway dashboard → **Deploy** sekmesi → **New Command** komutu çalıştır:

```bash
npx ts-node --project apps/api/tsconfig.json apps/api/prisma/seed.ts && npx ts-node --project apps/api/tsconfig.json apps/api/prisma/fix-passwords.ts
```

> Veya Railway terminal'den de çalıştırabilirsin.

---

## ADIM 4 — Vercel (Next.js Web)

1. https://vercel.com → **Add New Project** → GitHub repoyu seç
2. **Framework Preset**: Next.js (otomatik algılanır)
3. **Root Directory**: `.` (proje kökü — değiştirme)
4. **Environment Variables** ekle:
   ```
   NEXT_PUBLIC_API_URL = https://smartnexus-xxx.railway.app/api
   ```
   (Railway'den aldığın URL — `/api` ekini unutma!)
5. **Deploy** → Vercel URL al: `https://smartnexus-erp.vercel.app`

---

## ADIM 5 — Railway'de FRONTEND_URL Güncelle

Vercel URL'nı aldıktan sonra Railway'e geri dön:

- `FRONTEND_URL` değerini Vercel URL'siyle güncelle:
  ```
  FRONTEND_URL = https://smartnexus-erp.vercel.app
  ```
- Railway otomatik redeploy eder

---

## Demo Hesaplar (Canlıda da aynı)

| Rol        | E-posta              | Şifre           |
| ---------- | -------------------- | --------------- |
| SuperAdmin | admin@smartnexus.com | SmartNexus2026! |
| Bayi       | bayi@demo.com        | Bayi2026!       |
| İşletme    | isletme@demo.com     | Isletme2026!    |

---

## Özet Maliyet

| Servis     | Plan  | Ücret                       |
| ---------- | ----- | --------------------------- |
| Neon       | Free  | $0/ay                       |
| Railway    | Hobby | $5/ay (ilk $5 kredi hediye) |
| Vercel     | Free  | $0/ay                       |
| **TOPLAM** |       | **~$0-5/ay**                |

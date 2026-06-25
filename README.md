# SmartNexus ERP

Türkiye odaklı modüler ERP platformu: muhasebe, stok, POS, TMS, B2B ve bayi SaaS.

## Gereksinimler

- Node.js 20+
- PostgreSQL
- npm 9+

## Kurulum

```bash
# Bağımlılıklar
npm install

# Ortam değişkenleri
cp apps/api/.env.example apps/api/.env
# DATABASE_URL, JWT_SECRET vb. düzenleyin

# Veritabanı
npm run db:migrate
npm run db:seed

# Geliştirme
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs

## Demo hesaplar

| Rol      | E-posta              | Şifre           |
| -------- | -------------------- | --------------- |
| Admin    | admin@smartnexus.com | SmartNexus2026! |
| Bayi     | bayi@demo.com        | Bayi2026!       |
| İşletme  | isletme@demo.com     | Isletme2026!    |
| Kasiyer  | kasiyer@demo.com     | Isletme2026!    |
| Depo     | depo@demo.com        | Isletme2026!    |
| Şoför    | sofor@demo.com       | Isletme2026!    |
| Muhasebe | muhasebe@demo.com    | Isletme2026!    |

## Komutlar

| Komut                           | Açıklama                                |
| ------------------------------- | --------------------------------------- |
| `npm run dev`                   | API + Web geliştirme sunucuları         |
| `npm run build`                 | Production derlemesi                    |
| `npm run restart`               | Build sonrası sunucuları yeniden başlat |
| `npm run db:seed`               | Demo verileri yükle                     |
| `npm test --workspace=apps/api` | API unit testleri                       |
| `npm run format`                | Prettier ile kod formatlama             |

## Proje yapısı

```
apps/
  api/     NestJS + Prisma (PostgreSQL)
  web/     Next.js 14 dashboard
packages/  Paylaşılan paketler (varsa)
```

## Lisans

MIT — bkz. [LICENSE](LICENSE)

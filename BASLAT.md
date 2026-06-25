# 🚀 SmartNexus — Hızlı Başlatma Kılavuzu

## Gereksinimler

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://docker.com/products/docker-desktop) (PostgreSQL + Redis için)

---

## Adım 1 — Bağımlılıkları Yükle

```bash
cd C:\Users\w11\Desktop\PROJELER\SmartERP
npm install
cd apps/api && npm install
cd ../web && npm install
cd ../..
```

## Adım 2 — Veritabanını Başlat

```bash
docker-compose up -d
```

> PostgreSQL: localhost:5432 | Redis: localhost:6379

## Adım 3 — Prisma Migration & Seed

```bash
cd apps/api
npx prisma migrate dev --name faz5_full
npx prisma db seed
cd ../..
```

> **Sıfırdan başlatıyorsanız** tek komut yeterlidir: `npx prisma migrate dev --name faz5_full`
> **Önceki fazlar zaten varsa** schema değişmedi, sadece seed'i yeniden çalıştırabilirsiniz.
> Tüm modeller dahil: ERP (Fatura/Cari/Kasa), WMS (Stok/Depo/Transfer), TMS (Araç/Sevkiyat), B2B (Sipariş/Fiyat Listesi), SaaS (Tenant/Abonelik/Mesaj/Destek)

## Adım 4 — Çalıştır

```bash
npm run dev
```

## Erişim

| Servis        | URL                            |
| ------------- | ------------------------------ |
| 🌐 Web Arayüz | http://localhost:3000          |
| 🔌 API        | http://localhost:3001/api      |
| 📚 Swagger    | http://localhost:3001/api/docs |

## Demo Hesaplar

| Rol             | Email                | Şifre           | Açıklama              |
| --------------- | -------------------- | --------------- | --------------------- |
| SuperAdmin      | admin@smartnexus.com | SmartNexus2026! | Tüm sisteme erişim    |
| Bayi (İstanbul) | bayi@demo.com        | Bayi2026!       | Dealer1 İstanbul      |
| Bayi (Ankara)   | ankara.bayi@demo.com | Bayi2026!       | Dealer2 Ankara        |
| İşletme Sahibi  | isletme@demo.com     | Isletme2026!    | Teknoloji Market      |
| Muhasebe        | muhasebe@demo.com    | Isletme2026!    | Fatura/kasa erişimi   |
| Depo Sorumlusu  | depo@demo.com        | Isletme2026!    | Stok/depo erişimi     |
| Şoför           | sofor@demo.com       | Isletme2026!    | TMS sevkiyat görünümü |
| Ofis Dünyası    | ofis@demo.com        | Isletme2026!    | Business2 yöneticisi  |
| Şube (Kadıköy)  | sube@demo.com        | Sube2026!       | Kadıköy şubesi        |
| Şube (Beşiktaş) | besiktas@demo.com    | Sube2026!       | Beşiktaş şubesi       |

## Demo Veriler (Seed ile gelen)

- **7 tenant**: SuperAdmin, 2 Bayi, 2 İşletme, 2 Şube
- **17 ürün** (3 kategori), **3 depo**, stok hareketleri
- **11 cari** (müşteri/tedarikçi), **13 fatura** (satış+alış+iade)
- **15 POS fişi** (Nakit/Kart/Veresiye/Çek/Havale), **2 kasa**, **2 banka**
- **6 sevkiyat** (TMS), **4 araç**, **6 B2B sipariş**
- **5 destek talebi**, **3 mesaj**, **6 abonelik**

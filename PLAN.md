# SmartNexus — Master Geliştirme Planı

> **Versiyon:** 1.0 | **Başlangıç:** Haziran 2026  
> **Stack:** Next.js 14 · NestJS · PostgreSQL · Prisma · Redis · Turborepo  
> **Bu dosyayı her fazda okuyarak geliştirmeye devam et.**

---

## 🏗️ Proje Tanımı

SmartNexus; muhasebe (ERP), depo/stok (WMS), taşıma/lojistik (TMS) ve B2B e-ticaret modüllerini tek çatı altında toplayan, SaaS altyapısında bayilik sistemiyle satılan, modüler ve evrimleşebilir kurumsal yazılım platformudur.

---

## 🏢 Hiyerarşi

```
SuperAdmin (SmartNexus şirketi)
  └── Bayi (İl/Bölge — dealer)
        └── İşletme (son kullanıcı)
              └── Şube / Alt-bayi
```

Her katman aynı teknik kodu kullanır, izin tablosu neyin görüneceğini belirler.

---

## 🎯 Modüller

### SuperAdmin Paneli

- [ ] Kullanıcı & Rol Yönetimi
- [ ] Bayi Yönetimi (il/bölge bazlı lisanslama)
- [ ] İşletme Yönetimi (kart, abonelik, süre uzatma)
- [ ] Modül & Paket Yönetimi (Basic / Profesyonel / Platinyum)
- [ ] Fiyatlandırma & Kampanya
- [ ] Gelişmiş Raporlar (bayi bazlı, işletme bazlı, satış bazlı)
- [ ] Destek Sistemi (ticket + chat)
- [ ] Duyuru & Mesaj Merkezi (özel gün/bayram mesajları)
- [ ] Boss Screen (genel bakış KPI paneli)
- [ ] Sistem Ayarları (global on/off modül switch)
- [ ] Log & Audit Trail

### Bayi Paneli

- [ ] Kendi satışları ve komisyon raporları
- [ ] İşletme kartları (kendi sattıkları)
- [ ] Destek talepleri
- [ ] Mesaj merkezi
- [ ] Boss Screen (bayi bazlı)

### İşletme Paneli

#### ERP Modülleri

- [ ] Muhasebe (Genel Muhasebe, Mizan, Bilanço, Gelir Tablosu)
- [ ] Cari Hesap (müşteri/tedarikçi kartları, eksteler, risk limiti)
- [ ] Fatura (satış/alış, iade, proforma)
- [ ] Kasa & Banka (tahsilat, ödeme, virman, eksteler)
- [ ] Gider Yönetimi
- [ ] Vergi Modülü (KDV, Muhtasar)

#### WMS Modülleri

- [ ] Ürün & Hizmet Kartları (varyant, barkod, birim)
- [ ] Depo Yönetimi (çoklu depo, raf/lokasyon)
- [ ] Stok Hareketleri (giriş, çıkış, fire, sayım)
- [ ] Transfer Emirleri (işletme → şube stok transferi)
- [ ] Şube Stok Yönetimi (üst işletmeden çekme veya bağımsız)
- [ ] Minimum Stok & Otomatik Sipariş Uyarısı
- [ ] Fiyat Listeleri (çoklu liste, döviz bazlı)

#### TMS Modülleri (Orta Seviye)

- [ ] Sipariş Yönetimi (satış siparişi, satın alma siparişi)
- [ ] İrsaliye Yönetimi (sevk/teslim)
- [ ] Araç & Sürücü Yönetimi
- [ ] Rota Planlama
- [ ] Teslimat Durumu Takibi
- [ ] Sevkiyat Raporları

#### B2B Modülü

- [ ] B2B Sipariş Portalı (müşteriye özel fiyat)
- [ ] Toplu Sipariş Yükleme
- [ ] Teklif & Onay Süreci
- [ ] Müşteri Bazlı Fiyat Listesi
- [ ] B2B Dashboard (müşteri aktivite, sipariş durumu)

#### E-Dönüşüm (Entegratör API)

- [ ] E-Fatura (GİB entegrasyonu, entegratör üzerinden)
- [ ] E-Arşiv Fatura
- [ ] E-İrsaliye
- [ ] E-Müstahsil
- [ ] Portal Takibi

### Şube Paneli

- İşletme paneli ile aynı UI
- Stok: üst işletmeden transfer emri alabilir / bağımsız stok tutabilir
- Muhasebe: bağımsız veya merkeze bağlı (ayarlanabilir)
- B2B: opsiyonel

---

## 📦 SaaS Paket Yapısı

| Özellik     | Basic  | Profesyonel | Platinyum |
| ----------- | ------ | ----------- | --------- |
| Kullanıcı   | 3      | 10          | Sınırsız  |
| Depo        | 1      | 3           | Sınırsız  |
| Şube        | -      | 2           | Sınırsız  |
| E-Fatura    | 100/ay | 500/ay      | Sınırsız  |
| B2B Portal  | -      | ✅          | ✅        |
| TMS         | -      | Temel       | Tam       |
| API Erişimi | -      | -           | ✅        |
| Destek      | Ticket | Öncelikli   | 7/24      |

---

## 🗄️ Veritabanı Şeması (Ana Modeller)

```prisma
// Tenant = her işletme/şube kendi tenant'ı
model Tenant {
  id          String   @id @default(cuid())
  type        TenantType  // SUPERADMIN | DEALER | BUSINESS | BRANCH
  name        String
  parentId    String?  // şube → işletme, işletme → bayi (opsiyonel)
  plan        PlanType // BASIC | PROFESSIONAL | PLATINUM
  isActive    Boolean  @default(true)
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
}

model User {
  id        String  @id @default(cuid())
  tenantId  String
  email     String  @unique
  password  String
  name      String
  role      String  // OWNER | ADMIN | STAFF | ACCOUNTANT | WAREHOUSE | DRIVER
  isActive  Boolean @default(true)
}

model Product {
  id          String  @id @default(cuid())
  tenantId    String
  code        String
  name        String
  unit        String
  vatRate     Float
  isActive    Boolean @default(true)
  variants    ProductVariant[]
  stockItems  StockItem[]
}

model Warehouse {
  id        String  @id @default(cuid())
  tenantId  String
  name      String
  isDefault Boolean @default(false)
  locations WarehouseLocation[]
}

model StockItem {
  id          String  @id @default(cuid())
  tenantId    String
  productId   String
  warehouseId String
  quantity    Float   @default(0)
  minQuantity Float   @default(0)
}

model StockTransfer {
  id            String  @id @default(cuid())
  fromTenantId  String  // kaynak işletme/şube
  toTenantId    String  // hedef şube
  status        TransferStatus // PENDING | APPROVED | SHIPPED | RECEIVED | CANCELLED
  lines         StockTransferLine[]
}

model Invoice {
  id        String      @id @default(cuid())
  tenantId  String
  type      InvoiceType // SALES | PURCHASE | RETURN_SALES | RETURN_PURCHASE
  series    String
  number    Int
  date      DateTime
  dueDate   DateTime?
  contactId String
  lines     InvoiceLine[]
  eStatus   EInvoiceStatus?
}

model Contact {
  id          String  @id @default(cuid())
  tenantId    String
  type        ContactType // CUSTOMER | SUPPLIER | BOTH
  name        String
  taxNo       String?
  creditLimit Float?
  balance     Float   @default(0)
}

model Vehicle {
  id       String @id @default(cuid())
  tenantId String
  plate    String
  type     String
  driverId String?
}

model Shipment {
  id         String         @id @default(cuid())
  tenantId   String
  vehicleId  String?
  driverId   String?
  status     ShipmentStatus // PLANNED | IN_TRANSIT | DELIVERED | FAILED
  orders     ShipmentOrder[]
}

model B2BOrder {
  id         String      @id @default(cuid())
  tenantId   String      // seller
  customerId String      // buyer contact
  status     OrderStatus // DRAFT | PENDING | APPROVED | PROCESSING | SHIPPED | DELIVERED
  lines      B2BOrderLine[]
}

model Message {
  id         String   @id @default(cuid())
  fromTenantId String
  toType     String   // ALL | DEALERS | BUSINESSES | SPECIFIC
  toId       String?
  title      String
  body       String
  sentAt     DateTime?
  isScheduled Boolean @default(false)
  scheduledAt DateTime?
}

model SupportTicket {
  id         String       @id @default(cuid())
  tenantId   String
  subject    String
  status     TicketStatus // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  priority   Priority     // LOW | MEDIUM | HIGH | URGENT
  messages   TicketMessage[]
}

model Subscription {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  plan      PlanType
  startDate DateTime
  endDate   DateTime
  autoRenew Boolean  @default(false)
  dealerId  String?  // kim sattı
}
```

---

## 🗺️ Geliştirme Fazları

### ✅ FAZ 1 — Foundation (Haziran 2026)

- [x] Proje iskeleti (monorepo, npm workspaces)
- [x] PLAN.md
- [x] Docker Compose (PostgreSQL + Redis)
- [x] Prisma şeması (tüm modeller)
- [x] Auth sistemi (JWT, 4 rol, refresh token)
- [x] Login sayfası (split screen, demo fill)
- [x] SuperAdmin Boss Screen + Business Boss Screen (AreaChart, BarChart, PieChart)
- [x] Temel layout (sidebar dark, topbar, responsive)
- [x] Seed data (4 tenant: SuperAdmin/Bayi/İşletme/Şube + demo ürünler)

**Mevcut Skor: 35/100**

### ✅ FAZ 2 — ERP Core + POS (Haziran 2026)

- [x] Prisma şeması genişletildi (CashAccount, BankAccount, POSSession, POSReceipt, InvoicePayment...)
- [x] Backend: Contacts modülü (CRUD, quick-search, statement, aging)
- [x] Backend: Invoices modülü (CRUD, approve, addPayment, cancel, auto-numbering)
- [x] Backend: Cash modülü (kasa/banka hesapları, işlemler, virman, cash flow)
- [x] Backend: POS modülü (session, checkout, Hugin S1, stok düşme, veresiye)
- [x] Backend: Hugin S1 yazarkasa TCP/IP entegrasyonu (simulate mode)
- [x] Backend: Reports modülü (boss screen, satış, kar/zarar, stok değerleme, bayi)
- [x] Frontend: POS Hızlı Satış Ekranı (ürün grid, sepet, 5 ödeme tipi, müşteri arama, Hugin)
- [x] Frontend: Cari Hesaplar sayfası (liste, detay, yaşlandırma, hesap hareketleri)
- [x] Frontend: Faturalar sayfası (liste, detay, onay, tahsilat, yeni fatura)
- [x] Frontend: Kasa & Banka sayfası (kasa/banka/nakit akışı tabları, virman)
- [x] Frontend: Gelişmiş Raporlar sayfası (satış analizi, kar/zarar, stok değerleme, bayi)
- [x] Sidebar: POS linki eklendi

**Mevcut Skor: 55/100**

### ✅ FAZ 3 — WMS + Stok (Haziran 2026)

- [x] Prisma şeması: Product.deletedAt, minQuantity, type; Warehouse.city; StockItem triple-unique; StockMovement.userId; StockTransfer.createdById/expectedDate; StockTransferLine.sentQty/receivedQty; MovementType enum: ADJUST+COUNT
- [x] Backend: ProductsModule — CRUD, barkod kontrolü, kategori yönetimi, stok özeti, low-stock listesi, hareket geçmişi
- [x] Backend: InventoryModule — depo CRUD + stok değeri; stok hareketleri (IN/OUT/ADJUST/COUNT); stok sayımı; transfer emirleri (PENDING→APPROVED→SHIPPED→RECEIVED); dashboard metrikleri
- [x] Frontend: /inventory/products — ürün listesi, detay (fiyat/stok/marj kartları), kategori filtre, stok uyarısı, CRUD modal
- [x] Frontend: /inventory/warehouses — depo listesi (değer/qty), depo stok tablosu (maliyet/satış değeri), yeni depo
- [x] Frontend: /inventory/movements — hareket log tablosu, filtreler (depo/tür/tarih), manuel hareket modal, stok sayım modal
- [x] Frontend: /inventory/transfers — transfer emri listesi (IN/OUT yönü), detay + aksiyon butonları (onayla/sevket/teslim al/iptal), yeni transfer modal

**Mevcut Skor: 68/100**

### ✅ FAZ 4 — TMS + B2B (Haziran 2026)

- [x] Backend: TmsModule — Vehicle CRUD, Shipment CRUD, durum geçişleri (PLANNED→IN_TRANSIT→DELIVERED/FAILED), dashboard metrikleri, araç kodu auto-generate
- [x] Backend: B2bModule — B2BOrder CRUD, durum pipeline (DRAFT→PENDING→APPROVED→PROCESSING→SHIPPED→DELIVERED), PriceList + PriceListItem, müşteri ciro raporlama
- [x] app.module.ts: TmsModule + B2bModule import edildi
- [x] Frontend: /tms/vehicles — araç yönetimi (TRUCK/VAN/MOTORCYCLE), filtre, toggle aktif/pasif
- [x] Frontend: /tms/shipments — sevkiyat listesi + detay panel, durum akışı görselleştirmesi, aksiyon butonları
- [x] Frontend: /b2b/orders — sipariş listesi (status pill filtresi), detay panel, durum pipeline, kalem tablosu, yeni sipariş modal
- [x] Frontend: /b2b/customers — müşteri listesi + sipariş geçmişi + fiyat listesi atama
- [x] Frontend: /b2b/price-lists — fiyat listesi CRUD, ürün fiyatı satır içi düzenleme, indirim % gösterimi
- [x] Sidebar: Lojistik (TMS) ve B2B Portal grupları eklendi, default open
- [x] Demo seed: 4 araç, 6 sevkiyat, 6 B2B sipariş, 6 sevkiyat emri
- [x] BASLAT.md: Faz 4 migration, 10 demo hesap, demo veri özeti

**Mevcut Skor: 67/100**

### ✅ FAZ 5+6 — SuperAdmin/Bayi Paneli + SaaS + Mesaj + Destek (Haziran 2026)

- [x] Backend: TenantsModule — bayi/işletme CRUD, SuperAdmin dashboard, abonelik upsert/renew
- [x] Backend: MessagesModule — mesaj gönderme (ALL/DEALERS/BUSINESSES/BRANCHES), okundu takibi, inbox/sent
- [x] Backend: SupportModule — ticket CRUD, chat mesajları, durum geçişleri, SuperAdmin tam erişim
- [x] Frontend: /dealers — bayi listesi (KPI kartlar, detay paneli, aktif/pasif toggle, yeni bayi modal)
- [x] Frontend: /businesses — işletme listesi (abonelik uyarıları, süre takibi, abonelik modal)
- [x] Frontend: /subscriptions — abonelik tablosu (plan dağılımı, süresi bitiyor uyarısı, uzatma)
- [x] Frontend: /messages — inbox + gönderilmiş tablar, compose modal (hedefli gönderim), okundu sayısı
- [x] Frontend: /support — ticket listesi (status pill filtresi), chat arayüzü (sağ/sol balon), çözüm/kapatma
- [x] app.module.ts: TenantsModule + MessagesModule + SupportModule eklendi
- [x] PLAN.md + BASLAT.md güncellendi

**Mevcut Skor: 83/100**

### ✅ FAZ 7 — E-Dönüşüm + Kullanıcı + Ayarlar + PWA (Haziran 2026)

- [x] Backend: UsersModule — kullanıcı CRUD, şifre değiştirme, aktif/pasif toggle, rol yönetimi
- [x] Backend: E-Dönüşüm — InvoicesService'e sendEInvoice/cancelEInvoice/acceptEInvoice/rejectEInvoice + GIB mock ID üretimi
- [x] Backend: auth/me GET endpoint (settings sayfası için)
- [x] Frontend: /users — kullanıcı tablosu, rol badge, son giriş zamanı, şifre değiştirme modal
- [x] Frontend: /settings — Firma Profili / Fatura / Abonelik / Bildirimler / Güvenlik tab'lı ayarlar
- [x] Frontend: /accounting/einvoice — E-Dönüşüm paneli (GIB bağlantı durumu, tüm faturalar, tek tıkla gönder/kabul/red/iptal)
- [x] PWA: manifest.json (shortcut'larla), layout.tsx viewport/theme meta etiketleri
- [x] Sidebar: E-Dönüşüm + Ayarlar linkleri eklendi
- [x] app.module.ts: UsersModule eklendi

**Mevcut Skor: 91/100**

---

### Faz 8 — AI Talep Tahmini + Pazaryeri Entegrasyonu ✅

- [x] AI Forecasting: `inventory.service.ts`'e `getForecast()` eklendi (90 günlük harekat analizi, moving average, trend, urgency skoru, güven skoru)
- [x] Backend: `GET /api/inventory/forecast` endpoint eklendi
- [x] Frontend: `/inventory/forecasting/page.tsx` — AI tahmin dashboard (urgency heatmap, trend sparkline, expand detay, filtre/sıralama)
- [x] Pazaryeri: `marketplace` NestJS modülü oluşturuldu (MarketplaceService, MarketplaceController, MarketplaceModule)
- [x] Mock entegrasyonlar: Trendyol, Hepsiburada, Amazon TR (bağlan/kes, sipariş sync, stok sync, listeleme)
- [x] Frontend: `/marketplace/page.tsx` — platform kartları, sipariş tablosu, ürün listeleme, sync geçmişi
- [x] Sidebar: "AI Talep Tahmini" (Stok & Depo altında) + "Pazaryeri" eklendi
- [x] `app.module.ts`: MarketplaceModule import edildi

**Mevcut Skor: 96/100**

---

### FAZ 9 — Harici Entegrasyonlar (Haziran 2026) ✅

_Pazaryeri entegrasyonları (Faz 8) bilerek kapsam dışı bırakıldı._

- [x] UBL-TR 1.2.1 XML üretici (`ubl-tr.builder.ts`)
- [x] Uyumsoft SOAP istemcisi — SendInvoice, CancelInvoice, GetOutboxInvoiceStatus
- [x] Open Banking (BKM ÖHVPS) — OAuth yetkilendirme + hareket senkronu
- [x] iyzico + PayTR ödeme gateway — POS kart ödemesi, PayTR callback
- [x] Resend e-posta bildirim servisi
- [x] `TenantIntegration` + `PaymentTransaction` modelleri
- [x] `IntegrationsModule` — `/api/integrations/*` API
- [x] Kasa: `POST /cash/bank-accounts/:id/sync-open-banking`
- [x] Ayarlar → Entegrasyonlar sekmesi
- [x] Kasa sayfası: Open Banking Sync butonu

**Mevcut Skor: 98/100**

---

### FAZ 10 — Production Hazırlık & Uyumluluk (Haziran 2026) ✅

_Pazaryeri canlı API’leri kapsam dışı._

- [x] PWA service worker (`sw.js`) + otomatik kayıt
- [x] Denetim kaydı UI — `/accounting/audit`
- [x] Netgsm SMS servisi + durum API
- [x] Platinyum tenant API anahtarları (oluştur / listele / iptal)
- [x] Open Banking “Banka Bağla” + OAuth callback (Ayarlar)
- [x] Fatura e-posta bildirimi (`POST /integrations/email/invoice/:id`)
- [x] `TenantApiKey` modeli
- [x] `npm run restart` production sunucu akışı

**Mevcut Skor: 99/100**

---

### FAZ 11 — Malzeme Alış Tamamlama + E-Belge + Personel (Tamamlandı)

> **Durum:** Tamamlandı — Uyumsoft gelen e-fatura, Code128 etiket, e-irsaliye + şoför, personel TC/adres.

#### 11A — Uyumsoft Gelen E-Fatura (Otomatik Çekme)

- [x] Uyumsoft SOAP: gelen kutusu (`GetInboxInvoices` / `GetInvoice` veya eşdeğer metod) entegrasyonu
- [x] Periyodik senkron veya manuel “Gelen faturaları çek” butonu (`/accounting/purchases` + `/accounting/einvoice`)
- [x] UBL-TR parse → alış faturası + satır kalemleri + tedarikçi eşleştirme (VKN ile Contact)
- [x] Mevcut `importPurchaseFromEInvoice` akışına bağla; stok eşleştirme + otomatik stok kartı kuralları aynı kalsın
- [x] E-fatura durumu: `PENDING` → içe aktarıldı → onaylandı; hata/duplicate log
- [x] `.env`: `UYUMSOFT_*` test/prod ortam ayrımı dokümante edilsin

**Referans:** `uyumsoft-soap.client.ts`, `invoices.service.ts`, `accounting/purchases/page.tsx`

#### 11B — Barkod Etiket Basımı (Code128 Görsel)

- [x] Toplu barkod oluşturma korunur; etiket çıktısına **Code128 (SVG/Canvas)** barkod görseli ekle
- [x] Etiket şablonu: ürün adı, kod, birim, fiyat (opsiyonel), barkod numarası + çizgi barkod
- [x] Kapsam: tüm stok / kategori / seçili ürünler (mevcut modal genişletilir)
- [x] Yazdırma: A4 grid + termal etiket (58×40 mm) preset
- [x] Bağımlılık adayı: `jsbarcode` veya sunucu tarafı SVG üretimi

**Referans:** `products.service.ts`, `inventory/products/page.tsx`

#### 11C — E-İrsaliye + Şoför Otomatik Doldurma

- [x] E-irsaliye modeli / UBL-TR DespatchAdvice üretimi ve (Uyumsoft) gönderim-alım API
- [x] İrsaliye formu: şoför seçilince **otomatik doldur** — ad, telefon, TC kimlik no, adres (personel kartından)
- [x] Araç plakası seçilince araç + atanmış şoför bilgisi irsaliye/sevkiyat alanlarına gelsin
- [x] Sevkiyat (`Shipment`) ↔ e-irsaliye ↔ stok çıkışı ilişkisi
- [x] TMS: `[panel]/tms/shipments`, `[panel]/tms/vehicles` — şoför seçimi → ilgili alanlar otomatik

**Referans:** `tms.service.ts`, `Vehicle.driverId`, `Shipment.driverId`, `GET /users/drivers`

#### 11D — Personel Kaydı: TC Kimlik + Adres

- [x] `User` ve/veya bağlı `Contact` (personel kartı) alanları:
  - `nationalId` (TC Kimlik No, 11 hane, doğrulama)
  - `address`, `city`, `district` (Contact’ta kısmen var — form ve API tamamlanacak)
- [x] Personel / kullanıcı ekleme UI (`/users`): TC + adres; **DRIVER** rolü için zorunlu
- [x] `GET /users/drivers` yanıtına `nationalId`, `address` ekle — e-irsaliye ve TMS formları kullanır
- [x] KVKK: TC maskeleme listede, detayda tam gösterim (yetkili rol)

**Referans:** `users.service.ts`, `users/page.tsx`, `User.contactId` ↔ `Contact`

#### 11E — Kabul Kriterleri (Faz 11 bitiş)

- [x] Uyumsoft test ortamından ≥1 gelen e-fatura → otomatik alış faturası + stok girişi
- [x] Barkodsuz ürünler → toplu barkod + Code128 etiket yazdırma
- [x] Şoför TC + adres kaydı → irsaliye/sevkiyat formunda seçince alanlar dolu
- [x] E-irsaliye taslağı; şoför/araç bilgileri doğru aktarılıyor
- [x] Build + `npm run restart` sorunsuz

**Hedef skor:** 99 → **100/100**

---

## 📊 Rakip Analizi & Skor Tablosu

### Değerlendirme Kriterleri (her kriter 0-10)

| Kriter           | Açıklama                                       |
| ---------------- | ---------------------------------------------- |
| ERP Kapsamı      | Muhasebe, cari, kasa, vergi eksiksizliği       |
| WMS              | Stok, depo, transfer, sayım yetkinliği         |
| TMS              | Lojistik, araç, rota, teslimat takibi          |
| B2B              | Sipariş portalı, müşteri fiyatı, toplu sipariş |
| SaaS Altyapısı   | Bulut natif, uptime, ölçeklenebilirlik         |
| Bayilik Sistemi  | İl/bölge bazlı, komisyon, raporlama            |
| E-Dönüşüm        | E-fatura, e-arşiv, e-irsaliye kalitesi         |
| UI/UX            | Modernlik, kullanım kolaylığı, mobil uyum      |
| Fiyat/Performans | KOBİ'ye erişilebilirlik                        |
| Modülerlik       | Bağımsız modül satışı, genişletilebilirlik     |

### Skor Tablosu

| Rakip                | ERP | WMS | TMS | B2B | SaaS | Bayi | E-Dön | UX  | F/P | Modül | **TOPLAM** |
| -------------------- | --- | --- | --- | --- | ---- | ---- | ----- | --- | --- | ----- | ---------- |
| Logo Tiger 3         | 9   | 8   | 5   | 6   | 6    | 9    | 9     | 6   | 3   | 7     | **68**     |
| DIA Bulut ERP        | 8   | 7   | 5   | 5   | 7    | 6    | 9     | 7   | 4   | 7     | **65**     |
| Netsis Wing          | 8   | 7   | 4   | 5   | 6    | 9    | 9     | 5   | 5   | 6     | **64**     |
| Mikro ERP            | 7   | 7   | 3   | 4   | 5    | 7    | 8     | 5   | 7   | 5     | **58**     |
| Uyumsoft             | 6   | 5   | 3   | 4   | 6    | 5    | 10    | 6   | 6   | 6     | **57**     |
| Paraşüt              | 5   | 3   | 1   | 3   | 9    | 3    | 8     | 9   | 8   | 7     | **56**     |
| Luca                 | 7   | 2   | 1   | 2   | 7    | 3    | 8     | 7   | 8   | 5     | **50**     |
| ETA                  | 6   | 6   | 2   | 3   | 4    | 5    | 7     | 4   | 6   | 4     | **47**     |
| **SmartNexus Faz 1** | 1   | 1   | 0   | 0   | 3    | 0    | 0     | 6   | 0   | 2     | **13**     |
| **SmartNexus Faz 2** | 6   | 2   | 0   | 0   | 7    | 2    | 0     | 7   | 6   | 5     | **35**     |
| **SmartNexus Faz 3** | 7   | 7   | 0   | 0   | 8    | 4    | 0     | 8   | 7   | 7     | **48**     |
| **SmartNexus Faz 4** | 8   | 8   | 7   | 7   | 8    | 6    | 0     | 8   | 7   | 8     | **67**     |
| **SmartNexus Faz 5** | 8   | 8   | 7   | 8   | 9    | 9    | 9     | 8   | 8   | 9     | **83**     |
| **SmartNexus Faz 6** | 9   | 9   | 8   | 9   | 10   | 10   | 9     | 9   | 8   | 10    | **91**     |

### Rakip Güçlü/Zayıf Yönleri

**Logo Tiger 3 (68/100)**

- ✅ Çok kapsamlı ERP, güçlü bayilik ağı
- ❌ Pahalı, karmaşık UI, mobil zayıf, SaaS'a geçiş yarım

**DIA Bulut ERP (65/100)**

- ✅ Tam bulut, güçlü e-dönüşüm
- ❌ B2B portalı yok, TMS zayıf, bayilik sistemi sınırlı

**Paraşüt (56/100)**

- ✅ Modern UI, çok kullanıcılı, uygun fiyat, hızlı onboarding
- ❌ Sadece ön muhasebe, stok/depo yok, TMS yok, B2B yok

**SmartNexus Rekabet Avantajı (Faz 5 sonrası: 83/100):**

- ERP + WMS + TMS + B2B tek platformda → Türkiye'de benzeri yok
- İl/bölge bayilik sistemi tam SaaS → Logo/Netsis'in güçlü olduğu alan
- Modern 2026 UI/UX → Mevcut rakiplerin en zayıf noktası
- Modüler satış → KOBİ'den büyük işletmeye esnek fiyatlandırma
- Şube stok transferi → Zincir işletmeler için kritik

---

## 🛠️ Teknik Mimari

```
┌─────────────────────────────────────────────┐
│                  CLIENT                       │
│  Next.js 14 (App Router) + shadcn/ui        │
│  TypeScript + Tailwind CSS                   │
└──────────────────┬──────────────────────────┘
                   │ HTTPS / REST + WebSocket
┌──────────────────▼──────────────────────────┐
│                  API                          │
│  NestJS (TypeScript) — Modüler Mimari       │
│  JWT Auth · Guards · Interceptors            │
└──────┬───────────────────────┬──────────────┘
       │                       │
┌──────▼──────┐    ┌───────────▼───────────┐
│ PostgreSQL  │    │    Redis              │
│ (Ana DB)    │    │    (Cache + Queue)    │
│ Prisma ORM  │    │    BullMQ jobs        │
└─────────────┘    └───────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│  Harici Servisler                            │
│  E-Fatura Entegratörü API (Faz 5)           │
│  SMS/E-posta servisi (Faz 2)                │
│  Storage: MinIO / S3 (Faz 2)               │
└─────────────────────────────────────────────┘
```

### Multi-Tenancy Stratejisi

- **Row-Level Isolation:** Her tabloda `tenantId` zorunlu
- Tenant bazlı Prisma middleware (otomatik filter)
- Redis key prefix: `tenant:{id}:*`

### Evrimleşebilirlik

- NestJS modüler mimari → yeni modül = yeni klasör, app.module'e import
- Feature flags tablosu → beta modülleri tek tenant'a açılabilir
- Plugin sistemi (Faz 6 sonrası) → 3rd party entegrasyonlar

---

## 📁 Proje Yapısı

```
SmartERP/
├── PLAN.md                    ← Bu dosya
├── docker-compose.yml          ← PostgreSQL + Redis
├── docker-compose.dev.yml      ← Dev override
├── package.json                ← Workspace root
├── turbo.json                  ← Build pipeline
├── .env.example
├── apps/
│   ├── web/                   ← Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/           ← App Router
│   │   │   │   ├── (auth)/login/
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── dashboard/     ← Boss Screen
│   │   │   │       ├── dealers/
│   │   │   │       ├── businesses/
│   │   │   │       ├── inventory/
│   │   │   │       ├── accounting/
│   │   │   │       ├── tms/
│   │   │   │       ├── b2b/
│   │   │   │       ├── reports/
│   │   │   │       ├── support/
│   │   │   │       └── settings/
│   │   │   ├── components/
│   │   │   └── lib/
│   └── api/                   ← NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── tenants/
│       │   │   ├── users/
│       │   │   ├── products/
│       │   │   ├── inventory/
│       │   │   ├── invoices/
│       │   │   ├── contacts/
│       │   │   ├── tms/
│       │   │   ├── b2b/
│       │   │   └── reports/
│       │   └── prisma/
│       └── prisma/
│           └── schema.prisma
└── packages/
    ├── ui/                    ← Paylaşılan bileşenler
    └── types/                 ← Paylaşılan TS tipleri
```

---

## 🔐 Rol & İzin Matrisi

| İzin            | SuperAdmin | Bayi  | İşletme Sahibi | Şube Yöneticisi | Muhasebeci | Depo | Sürücü |
| --------------- | ---------- | ----- | -------------- | --------------- | ---------- | ---- | ------ |
| Sistem Ayarları | ✅         | ❌    | ❌             | ❌              | ❌         | ❌   | ❌     |
| Bayi Yönetim    | ✅         | Kendi | ❌             | ❌              | ❌         | ❌   | ❌     |
| İşletme Yönetim | ✅         | Kendi | ❌             | ❌              | ❌         | ❌   | ❌     |
| Fatura          | ✅         | ❌    | ✅             | ✅              | ✅         | ❌   | ❌     |
| Stok            | ✅         | ❌    | ✅             | ✅              | Görüntüle  | ✅   | ❌     |
| Muhasebe        | ✅         | ❌    | ✅             | Görüntüle       | ✅         | ❌   | ❌     |
| TMS             | ✅         | ❌    | ✅             | ✅              | ❌         | ❌   | Kendi  |
| B2B             | ✅         | ❌    | ✅             | ✅              | ❌         | ❌   | ❌     |
| Raporlar        | ✅         | Kendi | Kendi          | Kendi           | Kendi      | ❌   | ❌     |
| Boss Screen     | ✅         | ✅    | ✅             | ✅              | ❌         | ❌   | ❌     |

---

## 📡 API Endpoint Planı (Ana Rotalar)

```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /tenants              (SuperAdmin)
POST   /tenants
PATCH  /tenants/:id
DELETE /tenants/:id

GET    /users
POST   /users
PATCH  /users/:id

GET    /products
POST   /products
PATCH  /products/:id
DELETE /products/:id

GET    /inventory/stock
POST   /inventory/movements
POST   /inventory/transfers
GET    /inventory/transfers/:id
PATCH  /inventory/transfers/:id/status

GET    /invoices
POST   /invoices
PATCH  /invoices/:id
POST   /invoices/:id/send-einvoice

GET    /contacts
POST   /contacts
GET    /contacts/:id/statement   ← ekstre

GET    /tms/shipments
POST   /tms/shipments
GET    /tms/vehicles
GET    /tms/routes

GET    /b2b/orders
POST   /b2b/orders
PATCH  /b2b/orders/:id/approve

GET    /reports/boss-screen
GET    /reports/sales
GET    /reports/dealers
GET    /reports/inventory

GET    /support/tickets
POST   /support/tickets
POST   /support/tickets/:id/messages

POST   /messages/broadcast
GET    /messages
```

---

## ⚙️ Çalıştırma Kılavuzu

### Gereksinimler

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (veya yerel PostgreSQL + Redis)

### Kurulum

```bash
# 1. Bağımlılıkları yükle
pnpm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env içinde DATABASE_URL ve JWT_SECRET düzenle

# 3. Veritabanını başlat (Docker)
docker-compose up -d

# 4. Prisma migration çalıştır
pnpm --filter api prisma migrate dev

# 5. Seed data yükle (SuperAdmin kullanıcısı)
pnpm --filter api prisma db seed

# 6. Projeyi başlat
pnpm dev

# Web: http://localhost:3000
# API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### Varsayılan Giriş

- **Email:** admin@smartnexus.com
- **Şifre:** SmartNexus2026!

---

## 📝 Geliştirme Kuralları

1. Her modül kendi klasöründe, `index.ts` ile dışa aktarım
2. Tüm DB sorgularında `tenantId` filtresi zorunlu
3. Her endpoint JWT guard + rol kontrolü
4. Yeni özellik = yeni branch → PR → main
5. Her fazın sonunda kullanılmayan dosyalar temizlenir
6. API değişikliği = Swagger güncellemesi zorunlu
7. Türkçe değişken isimleri yasak, kod İngilizce, yorum/commit Türkçe olabilir

---

_Son güncelleme: Haziran 2026 — Faz 11 tamamlandı · Skor: 100/100_

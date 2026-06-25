# SmartNexus ERP — Modül 2, 3, 4, 5, 6 Geliştirme Planı

Bu plan, **İnsan Kaynakları (HR), CRM, Mobil Uygulama, AI Otomasyonları ve B2C E-Ticaret** modüllerinin SmartNexus platformuna entegre edilmesini ve SuperAdmin tarafında **SaaS Paketi (Addon)** olarak satılabilir şekilde tasarlanmasını kapsamaktadır.

## User Review Required

> [!IMPORTANT]
> Bu plan 5 büyük modülü aynı anda içermektedir. Tek seferde hepsinin entegre edilmesi yerine **Faz 12 (HR & CRM)**, **Faz 13 (Mobil & B2C)** ve **Faz 14 (AI)** olarak adım adım (incremental) gitmeyi öneriyorum. Aşağıdaki tasarımı inceledikten sonra ilk hangi adımla başlayacağımıza onay vermenizi rica ediyorum.

## SaaS Paketleme (Addon) Mimarisi

Tüm yeni modüller `AddonModuleCode` enum tipine eklenerek, SuperAdmin tarafından işletmelere parayla (veya pakete dahil olarak) satılabilecek şekilde kurgulanacaktır:
- `HR_PAYROLL`: İnsan Kaynakları ve Bordro Modülü
- `ADVANCED_CRM`: Gelişmiş CRM ve Satış Hunisi
- `MOBILE_ACCESS`: Native Mobil Uygulama Erişimi
- `AI_FEATURES`: Yapay Zeka Özellikleri (Fiş OCR, Chatbot)
- `B2C_ECOMMERCE`: Shopify/WooCommerce B2C Entegrasyonu

Mevcut **PlanTemplate** yapısında (Platinyum, Profesyonel vb.) bu eklentiler "Dahil" ya da "Hariç" olarak ayarlanabilecek. İşletme giriş yaptığında, `subscription.purchasedAddons` listesinde modül yoksa menüde "Bu modülü satın al" ekranı (Upsell) görünecek.

---

## Proposed Changes

### 1. Veritabanı Değişiklikleri (`schema.prisma`)

#### [MODIFY] [schema.prisma](file:///c:/Users/w11/Desktop/PROJELER/SmartERP/apps/api/prisma/schema.prisma)
Aşağıdaki modeller ve enumlar eklenecek:

**AddonModuleCode Enum Güncellemesi:**
```prisma
enum AddonModuleCode {
  POS_YAZARKASA
  API_ACCESS
  MARKETPLACE
  EINVOICE
  EARCHIVE
  SMS
  // YENİ EKLENENLER:
  HR_PAYROLL
  ADVANCED_CRM
  MOBILE_ACCESS
  AI_FEATURES
  B2C_ECOMMERCE
}
```

**Modül 2: İnsan Kaynakları (HR) & Bordro Modelleri**
```prisma
model EmployeeLeave {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  startDate DateTime
  endDate   DateTime
  type      String   // ANNUAL, SICK, UNPAID
  status    String   // PENDING, APPROVED, REJECTED
}

model Payroll {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  period    String   // 2026-06
  baseSalary Float
  bonus     Float?
  deduction Float?
  netPay    Float
}
```

**Modül 3: CRM & Pipeline Modelleri**
```prisma
model Lead {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  company   String?
  email     String?
  phone     String?
  status    String   // NEW, CONTACTED, QUALIFIED, LOST
}

model Deal {
  id          String   @id @default(cuid())
  tenantId    String
  title       String
  value       Float
  stage       String   // PROSPECTING, PROPOSAL, WON, LOST
  contactId   String?  // Mevcut Contact modeline bağlı
}

model Activity {
  id          String   @id @default(cuid())
  tenantId    String
  type        String   // CALL, EMAIL, MEETING
  notes       String
  date        DateTime
  dealId      String?
}
```

**Modül 6: B2C E-Ticaret**
Mevcut `TenantIntegration` modeli kullanılacak. `IntegrationType` enum'ına `B2C_ECOMMERCE` eklenecek.

---

### 2. Backend Geliştirmeleri (NestJS)

* **Yetkilendirme (Guards):** Yeni eklenecek API endpoint'lerine (ör: `/api/hr/*`) bir `AddonGuard` ekleyeceğiz. Bu guard, tenant'ın ilgili eklentiyi satın alıp almadığını kontrol edecek.
* **HR Modülü (`apps/api/src/modules/hr`):** İzin, bordro ve personel performans API'leri.
* **CRM Modülü (`apps/api/src/modules/crm`):** Lead, Deal (Kanban için) ve Aktivite API'leri.
* **AI Modülü (`apps/api/src/modules/ai`):** Fiş/Fatura fotoğrafından text çıkaran OCR (Google Vision veya OpenAI Vision API ile) ve Chatbot endpoint'i.
* **B2C Modülü (`apps/api/src/modules/b2c`):** Webhook dinleyicileri (Shopify'dan sipariş düştüğünde ERP'ye aktaran yapı).

---

### 3. Frontend Geliştirmeleri (Next.js)

Aşağıdaki rotalar (routes) eklenecek. Eğer tenant modülü satın almamışsa, bu sayfalara girildiğinde **"Premium Özellik - Yükselt"** ekranı çıkacak.

* **[NEW] `apps/web/src/app/(dashboard)/hr`**: Personel listesi, izin takvimi, bordro tabloları.
* **[NEW] `apps/web/src/app/(dashboard)/crm`**: Sürükle-bırak (Drag & Drop) özellikli Kanban panosu (Pipeline), Potansiyel müşteri listesi.
* **[NEW] `apps/web/src/app/(dashboard)/ai-assistant`**: Sohbet arayüzü ve OCR ile Gider/Masraf yükleme ekranı.
* **[NEW] `apps/web/src/app/(dashboard)/b2c`**: Shopify entegrasyon ayarları ve B2C sipariş listesi.

---

### 4. Mobil Uygulama API'si (Modül 4)

Native bir mobil uygulama için backend tarafında mobil cihazlara özel `/api/mobile/v1/*` endpoint'leri hazırlanacak. JWT tabanlı güvenli bir mobil giriş ve depo barkod okuma ile saha satış sipariş oluşturma rotaları açılacak. (Tercihe bağlı olarak `apps/mobile` altında bir Expo (React Native) projesi iskeleti oluşturulabilir).

## Verification Plan

### Test Edilecek Senaryolar
1. **SaaS Paket İzolasyonu:** Basic paketteki bir işletme CRM modülüne girmeye çalıştığında engellenecek ve "Satın Al" ibaresiyle karşılacak. SuperAdmin üzerinden yetki verildiğinde anında modül açılacak.
2. **CRM Kanban:** Fırsatların aşamalar arası sürüklenip bırakılmasıyla veritabanında stage (aşama) değişikliğinin kaydedilmesi.
3. **AI OCR:** Bir masraf fişinin OCR simülatörüne gönderilip, KDV ve Tutarın otomatik ayrıştırılması.

### Kullanıcıdan Beklenen Onay
Eğer bu mimari kafanıza yattıysa, kodlamaya **Prisma şemasını güncelleyerek ve Modül 2 (HR) ile Modül 3 (CRM)** altyapılarını kurarak başlamayı öneriyorum. Onaylıyor musunuz?

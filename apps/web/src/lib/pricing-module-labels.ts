import { getModuleLabel } from '@/lib/modules';

/** Fiyatlandırma ekranında kesin Türkçe karşılıklar */
export const PRICING_MODULE_LABELS: Record<string, string> = {
  'ACCOUNTING.INVOICES': 'Faturalar',
  'ACCOUNTING.CONTACTS': 'Cari Hesaplar',
  'ACCOUNTING.CASH': 'Kasa & Banka',
  'ACCOUNTING.LEDGER': 'Genel Muhasebe',
  'ACCOUNTING.EXPENSES': 'Giderler',
  'ACCOUNTING.AUDIT': 'Denetim Kaydı',
  'ACCOUNTING.EDOCUMENT': 'E-Dönüşüm',
  'ACCOUNTING.REPORTS': 'Muhasebe Raporları',
  'INVENTORY.PRODUCTS': 'Ürünler',
  'INVENTORY.WAREHOUSES': 'Depolar',
  'INVENTORY.MOVEMENTS': 'Stok Hareketleri',
  'INVENTORY.TRANSFERS': 'Transfer Emirleri',
  'INVENTORY.AI_FORECAST': 'AI Talep Tahmini',
  'POS.MAIN': 'Hızlı Satış ve POS Ekranı',
  'TMS.SHIPMENTS': 'Sevkiyatlar',
  'TMS.VEHICLES': 'Araçlar',
  'B2B.ORDERS': 'Siparişler',
  'B2B.CUSTOMERS': 'Müşteriler',
  'B2B.PRICE_LISTS': 'Fiyat Listeleri',
  'B2C.MAIN': 'B2C E-Ticaret',
  'MARKETPLACE.MAIN': 'Pazaryeri',
  'MULTI_BRANCH.MAIN': 'Şube Yönetimi',
  'MRP.BOMS': 'Ürün Reçeteleri (BOM)',
  'MRP.WORK_ORDERS': 'İş Emirleri',
  'HR.PERSONNEL': 'Personel Yönetimi',
  'HR.LEAVES': 'İzin Yönetimi',
  'HR.PAYROLL': 'Bordro',
  'WMS.LOCATIONS': 'Depo Raf/Lokasyon',
  'WMS.SCANNER': 'Barkod ve El Terminali',
  'WMS.PICKING': 'Toplama ve Paketleme',
  'CRM.LEADS': 'Müşteri Adayları',
  'CRM.PIPELINE': 'Satış Fırsatları',
  'DEALER.BRANCHES': 'Şube Takibi',
  'DEALER.BUSINESSES': 'İşletme Yönetimi',
  'DEALER.COMMISSION': 'Hakediş Raporları',
  'DEALER.BILLING': 'Platform Faturaları',
  'DEALER.REPORTS': 'Gelişmiş Raporlama',
  'DEALER.MESSAGES': 'Sistem Mesajları',
  'DEALER.SUBSCRIPTIONS': 'Abonelik Yönetimi',
  'DEALER.USERS': 'Kullanıcı Yönetimi',
};

const MODULE_KEY_RE = /^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_.]*$/;

export function pricingModuleLabel(idOrLabel: string): string {
  const raw = String(idOrLabel).trim();
  if (!raw) return raw;
  if (PRICING_MODULE_LABELS[raw]) return PRICING_MODULE_LABELS[raw];
  if (MODULE_KEY_RE.test(raw)) {
    return PRICING_MODULE_LABELS[raw] ?? getModuleLabel(raw);
  }
  return raw;
}

export function resolvePricingModuleLabels(plan: {
  modules?: string[];
  moduleLabels?: string[];
  maxBranches?: number;
}): string[] {
  let labels: string[] = [];
  if (plan.modules?.length) {
    labels = plan.modules.map((id) => pricingModuleLabel(id));
  } else {
    labels = (plan.moduleLabels ?? []).map((item) => pricingModuleLabel(item));
  }

  if (plan.maxBranches && plan.maxBranches > 0) {
    labels = labels.map((l) =>
      l === PRICING_MODULE_LABELS['MULTI_BRANCH.MAIN']
        ? `${l} (${plan.maxBranches} Adet Ücretsiz)`
        : l
    );
  }

  return labels;
}

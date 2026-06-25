/** Abonelik planı görünen adları (BASIC / PROFESSIONAL / PLATINUM) */
export const PLAN_META: Record<
  string,
  { label: string; tagline: string; badge?: string; color: string }
> = {
  BASIC: {
    label: 'Nexus Başlangıç',
    tagline: 'Küçük işletmeler için temel ERP',
    color: 'border-gray-200',
  },
  PROFESSIONAL: {
    label: 'Nexus Profesyonel',
    tagline: 'Büyüyen işletmeler için genişletilmiş set',
    badge: 'Popüler',
    color: 'border-indigo-300 ring-2 ring-indigo-100',
  },
  PLATINUM: {
    label: 'Nexus Kurumsal',
    tagline: 'Çok şubeli ve kurumsal müşteriler',
    color: 'border-amber-300',
  },
};

export const PLAN_ORDER = ['BASIC', 'PROFESSIONAL', 'PLATINUM'] as const;

export function planLabel(plan: string): string {
  return PLAN_META[plan]?.label ?? plan;
}

export const KONTOR_LOW_THRESHOLD = 50;

export const SUBSCRIPTION_ADDON_CODES = ['POS_YAZARKASA', 'API_ACCESS', 'MARKETPLACE'] as const;

export const KONTOR_MODULE_CODES = ['EINVOICE', 'EARCHIVE', 'SMS'] as const;

/** Ek paket Türkçe görünen adlar (API adı yedek) */
export const ADDON_META: Record<string, { name: string; description: string }> = {
  POS_YAZARKASA: {
    name: 'Yazarkasa POS',
    description: 'Fiziksel yazarkasa ve hızlı satış entegrasyonu',
  },
  API_ACCESS: {
    name: 'Sistem API',
    description: 'Harici sistemlerle veri alışverişi ve otomasyon',
  },
  MARKETPLACE: {
    name: 'E-Pazaryeri',
    description: 'Trendyol, Hepsiburada ve diğer pazaryerleri',
  },
};

export function addonLabel(code: string, fallbackName?: string): string {
  return ADDON_META[code]?.name ?? fallbackName ?? code;
}

export function addonDescription(code: string, fallback?: string | null): string {
  return ADDON_META[code]?.description ?? fallback ?? '';
}

/** Kontör modülü Türkçe görünen adlar */
export const KONTOR_META: Record<string, { name: string; description: string }> = {
  EINVOICE: {
    name: 'E-Fatura',
    description: 'GİB uyumlu e-fatura kontör paketleri',
  },
  EARCHIVE: {
    name: 'E-Arşiv',
    description: 'E-arşiv fatura gönderim kontörleri',
  },
  SMS: {
    name: 'SMS Bildirim',
    description: 'Müşteri ve personel SMS bildirim kontörleri',
  },
};

export function kontorLabel(code: string, fallbackName?: string): string {
  return KONTOR_META[code]?.name ?? fallbackName ?? code;
}

export function kontorDescription(code: string, fallback?: string | null): string {
  return KONTOR_META[code]?.description ?? fallback ?? '';
}

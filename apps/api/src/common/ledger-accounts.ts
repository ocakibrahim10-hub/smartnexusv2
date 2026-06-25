/** Türkiye tek düzen hesap planı — özet şablon (KOBİ) */
export const DEFAULT_LEDGER_ACCOUNTS = [
  { code: '100', name: 'Kasa', type: 'ASSET' },
  { code: '102', name: 'Bankalar', type: 'ASSET' },
  { code: '120', name: 'Alıcılar', type: 'ASSET' },
  { code: '153', name: 'Ticari Mallar', type: 'ASSET' },
  { code: '191', name: 'İndirilecek KDV', type: 'ASSET' },
  { code: '320', name: 'Satıcılar', type: 'LIABILITY' },
  { code: '391', name: 'Hesaplanan KDV', type: 'LIABILITY' },
  { code: '500', name: 'Sermaye', type: 'EQUITY' },
  { code: '600', name: 'Yurtiçi Satışlar', type: 'REVENUE' },
  { code: '610', name: 'Satıştan İadeler', type: 'REVENUE' },
  { code: '710', name: 'Direkt İlk Madde ve Malzeme', type: 'EXPENSE' },
  { code: '770', name: 'Genel Yönetim Giderleri', type: 'EXPENSE' },
] as const;

export type LedgerAccountType = (typeof DEFAULT_LEDGER_ACCOUNTS)[number]['type'];

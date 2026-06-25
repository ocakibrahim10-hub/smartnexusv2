/** Türkiye banka kodları — Faz 2 Open Banking entegrasyonu için */
export const TR_BANKS = [
  { code: 'ZIRAAT', name: 'Ziraat Bankası', openBanking: true },
  { code: 'ISBANK', name: 'Türkiye İş Bankası', openBanking: true },
  { code: 'GARANTI', name: 'Garanti BBVA', openBanking: true },
  { code: 'AKBANK', name: 'Akbank', openBanking: true },
  { code: 'YAPIKREDI', name: 'Yapı Kredi', openBanking: true },
  { code: 'HALKBANK', name: 'Halkbank', openBanking: true },
  { code: 'VAKIFBANK', name: 'VakıfBank', openBanking: true },
  { code: 'QNB', name: 'QNB Finansbank', openBanking: true },
  { code: 'DENIZBANK', name: 'DenizBank', openBanking: false },
  { code: 'TEB', name: 'TEB', openBanking: false },
] as const;

export type BankIntegrationMode = 'MANUAL' | 'CSV_IMPORT' | 'OPEN_BANKING' | 'MT940';

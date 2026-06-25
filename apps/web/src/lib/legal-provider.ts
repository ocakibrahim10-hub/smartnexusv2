/** SmartNexus yazılım hizmet sağlayıcısı — sözleşme tarafları */
export const LEGAL_PROVIDER = {
  legalName:
    'Mine Bilişim İletişim Endüstriyel Temizlik Ürünleri Dış Ticaret — Halil İbrahim OCAK',
  brandName: 'SmartNexus',
  address: 'Hasan Basri Çantay Mah. Cengiz Topel Cad. No:90/C Altıeylül/Balıkesir',
  city: 'Balıkesir',
  province: 'Balıkesir',
  country: 'Türkiye',
  legalEmail: 'hukuk@minebilisim.com',
  kvkkEmail: 'kvkk@minebilisim.com',
  supportEmail: 'destek@minebilisim.com',
  /** TBK m.182 — cezai şart çarpanı (son 24 ay ödenen bedel) */
  penaltyMultiplier: 5,
  /** Asgari cezai şart (TL) */
  penaltyMinimumTry: 500_000,
  jurisdictionCourts: 'Balıkesir Mahkemeleri ve İcra Daireleri',
} as const;

export const LEGAL_DOCUMENT_VERSION = '2026.06.2';

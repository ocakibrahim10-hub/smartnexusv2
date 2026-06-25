import { LEGAL_DOCUMENT_VERSION, LEGAL_PROVIDER } from './legal-provider';

export { LEGAL_DOCUMENT_VERSION, LEGAL_PROVIDER };

export type LegalDocumentId =
  | 'MASTER_SAAS'
  | 'KVKK_AYDINLATMA'
  | 'ANTIRESELL'
  | 'DEALER_MANDATE'
  | 'DISTANCE_SALES';

export type LegalDocumentDef = {
  id: LegalDocumentId;
  title: string;
  shortLabel: string;
  requiredFor: ('dealer_business' | 'subscription_checkout')[];
  content: string;
};

const P = LEGAL_PROVIDER;
const V = LEGAL_DOCUMENT_VERSION;

export const LEGAL_DOCUMENTS: LegalDocumentDef[] = [
  {
    id: 'MASTER_SAAS',
    title: 'SmartNexus Bulut ERP Kullanıcı Lisans ve Hizmet Sözleşmesi',
    shortLabel: 'Kullanıcı Lisans Sözleşmesi',
    requiredFor: ['dealer_business', 'subscription_checkout'],
    content: `SMARTNEXUS BULUT ERP KULLANICI LİSANS VE HİZMET SÖZLEŞMESİ
Sürüm: ${V}

1. TARAFLAR
1.1. Hizmet Sağlayıcı (Lisans Veren): ${P.legalName}, adres: ${P.address} ("${P.brandName}" / "Hizmet Sağlayıcı").
1.2. Müşteri: Kayıt ve ödeme sırasında kimlik, vergi ve iletişim bilgileri sisteme girilen tüzel veya gerçek kişi ("Müşteri" / "Lisans Alan").

2. KONU VE KAPSAM
2.1. İşbu Sözleşme; SmartNexus markası altında sunulan bulut tabanlı ERP, WMS, TMS, B2B, POS ve ilgili modüllerin (topluca "Yazılım") Müşteri'ye 6098 sayılı Türk Borçlar Kanunu ("TBK") ve 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında süreli, münhasır olmayan kullanım hakkının tanınmasını düzenler.
2.2. Yazılımın mülkiyeti Hizmet Sağlayıcı'ya aittir; Müşteri'ye yalnızca sözleşme süresi boyunca, seçilen paket ve modül limitleri dahilinde kullanım lisansı verilir.
2.3. Hizmet elektronik ortamda anında ifa edilir; ödeme onayı ile abonelik aktive olur.

3. LİSANS KOŞULLARI
3.1. Lisans devredilemez, kiralanamaz, alt lisanslanamaz, rehin edilemez veya üçüncü kişilere devredilemez.
3.2. Kullanım yalnızca Müşteri'nin kendi ticari faaliyeti ve yetkili personeli ile sınırlıdır.
3.3. Paket dışı modül, kullanıcı, depo, şube veya işlem limiti aşımları ayrıca ücretlendirilir.
3.4. Müşteri; kullanıcı adı, şifre, API anahtarı ve erişim bilgilerinin gizliliğinden sorumludur.

4. YASAKLI FAALİYETLER
4.1. Yazılımın veya arayüzün üçüncü kişilere satılması, kiralanması, bayi/alt bayi olarak sunulması.
4.2. Aynı lisans altında birden fazla bağımsız işletmenin fiilen çalıştırılması.
4.3. Tersine mühendislik, kaynak koda erişim, güvenlik testi (yazılı izin olmadan), otomatik veri kazıma.
4.4. Zararlı yazılım yükleme, hizmeti aksatma, rate limit aşımı, sahte kayıt.

5. ÜCRET, FATURA VE AKTİVASYON
5.1. Abonelik bedeli yıllık olarak peşin veya Sanal POS ile tahsil edilir.
5.2. Ödeme onayı gelmeden hesap aktif edilmez, modül erişimi açılmaz.
5.3. Fatura ve e-arşiv/e-fatura yükümlülükleri ilgili mevzuata uygun yerine getirilir.

6. HİZMET SEVİYESİ VE DESTEK
6.1. Hizmet Sağlayıcı, makul ticari çaba ile %99 erişilebilirlik hedefler; planlı bakım önceden duyurulur.
6.2. Teknik destek kanalları: ${P.supportEmail} ve panel içi destek modülü.

7. FİKRİ MÜLKİYET
7.1. Yazılım, arayüz, logo, dokümantasyon ve türev çalışmalar 5846 sayılı Fikir ve Sanat Eserleri Kanunu kapsamında Hizmet Sağlayıcı'ya aittir.
7.2. Müşteri verilerinin mülkiyeti Müşteri'ye aittir; Hizmet Sağlayıcı yalnızca hizmet ifası için işler.

8. GİZLİLİK VE KVKK
8.1. Kişisel veriler 6698 sayılı KVKK ve ilgili ikincil mevzuata uygun işlenir.
8.2. KVKK Aydınlatma Metni ve Veri İşleme Ek Protokolü işbu Sözleşmenin ayrılmaz parçasıdır.

9. SORUMLULUK SINIRI
9.1. Hizmet Sağlayıcı; Müşteri'nin veri girişi hataları, üçüncü taraf entegrasyon kesintileri ve mücbir sebep hallerinden sorumlu değildir.
9.2. Dolaylı zarar, kar kaybı ve veri kaybından doğan zararlar hariç tutulur; toplam sorumluluk son 12 ayda Müşteri tarafından ödenen hizmet bedeli ile sınırlıdır (kast ve ağır kusur hariç).

10. SÜRE, YENİLEME VE FESİH
10.1. Abonelik süresi ödeme onayından itibaren 1 (bir) yıldır.
10.2. Süre bitiminde yenileme yapılmazsa erişim askıya alınır; veriler yasal saklama süresi sonunda silinir.
10.3. Ağır sözleşme ihlalinde Hizmet Sağlayıcı tek taraflı derhal fesih ve erişim kapatma hakkına sahiptir.

11. UYUŞMAZLIK VE YETKİ
11.1. İşbu Sözleşme Türk Hukuku'na tabidir.
11.2. Uyuşmazlıklarda ${P.jurisdictionCourts} yetkilidir.

12. YÜRÜRLÜK
12.1. Elektronik onay (checkbox) ıslak imza hükmündedir.
12.2. Onay anı, IP adresi, kullanıcı kimliği ve sözleşme sürümü denetim kaydı olarak saklanır.`,
  },
  {
    id: 'KVKK_AYDINLATMA',
    title: 'Kişisel Verilerin Korunması Aydınlatma Metni',
    shortLabel: 'KVKK Aydınlatma Metni',
    requiredFor: ['dealer_business', 'subscription_checkout'],
    content: `KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ
Sürüm: ${V}

Veri Sorumlusu: ${P.legalName}
Adres: ${P.address}
İletişim: ${P.kvkkEmail}

1. VERİ SORUMLUSU VE VERİ İŞLEYEN ROLLERİ
1.1. SmartNexus platformu kapsamında ${P.legalName} veri sorumlusu sıfatıyla hareket eder.
1.2. Müşteri'nin kendi personel, cari ve operasyonel verilerinde Müşteri veri sorumlusu; ${P.brandName} veri işleyen konumundadır (KVKK m.3 ve m.12).

2. İŞLENEN KİŞİSEL VERİ KATEGORİLERİ
Kimlik, iletişim, müşteri işlem, finans (fatura/ödeme), lokasyon, işlem güvenliği (log, IP, cihaz), yetkilendirme, pazarlama tercihi (açık rıza varsa).

3. İŞLEME AMAÇLARI
Sözleşmenin kurulması ve ifası, abonelik yönetimi, faturalandırma, Sanal POS tahsilatı, teknik destek, bilgi güvenliği, dolandırıcılık önleme, yasal yükümlülükler, hizmet kalitesi ölçümü.

4. HUKUKİ SEBEPLER (KVKK m.5)
Sözleşmenin kurulması/ifası (m.5/2-c), hukuki yükümlülük (m.5/2-ç), meşru menfaat (m.5/2-f), açık rıza gereken hallerde m.5/1.

5. AKTARIM
5.1. Ödeme kuruluşları, barındırma (cloud), e-fatura/e-arşiv entegratörleri, SMS/e-posta sağlayıcıları.
5.2. Yurt dışı aktarımda KVKK m.9 güvenceleri (yeterlilik kararı, taahhütname veya açık rıza) uygulanır.

6. SAKLAMA SÜRESİ
Sözleşme süresi + yasal zamanaşımı ve vergi mevzuatı saklama süreleri; süre sonunda silme, yok etme veya anonimleştirme.

7. İLGİLİ KİŞİ HAKLARI (KVKK m.11)
Başvuru hakkı; bilgi talebi, düzeltme, silme, itiraz, zararın giderilmesi talebi — ${P.kvkkEmail} üzerinden veya yazılı başvuru ile.

8. GÜVENLİK TEDBİRLERİ
KVKK m.12 kapsamında erişim kontrolü, şifreleme, loglama, yetkilendirme, yedekleme ve personel gizlilik taahhütleri.

9. ÇEREZLER
Zorunlu oturum ve güvenlik çerezleri; analitik çerezler ayrı bilgilendirme ile.

10. YÜRÜRLÜK
Platforma kayıt ve ödeme öncesi elektronik onay ile kabul edilir.`,
  },
  {
    id: 'ANTIRESELL',
    title: 'Alt Bayi Satışı, Lisans Suistimali ve Cezai Şart Protokolü',
    shortLabel: 'Yeniden Satış Yasağı ve Cezai Şart',
    requiredFor: ['dealer_business', 'subscription_checkout'],
    content: `ALT BAYİ SATIŞI, LİSANS SUISTİMALİ VE CEZAİ ŞART PROTOKOLÜ
Sürüm: ${V}

Taraflar: ${P.legalName} ("Hizmet Sağlayıcı") ile Müşteri/Bayi.

1. TANIMLAR
1.1. "Yeniden Satış": SmartNexus lisansının üçüncü kişilere ticari kazanç amacıyla devri, alt lisansı, bayi ağı kurularak kullandırılması veya fiilen bağımsız işletmelerin aynı lisans altında çalıştırılması.
1.2. "Suistimal": Sahte VKN/ünvan, ghost işletme, platinyum paket ile toplu alt kullanıcı ağı, şubenin bağımsız bayi gibi satışa konu edilmesi.

2. İŞLETME YÜKÜMLÜLÜKLERİ
2.1. İşletme yalnızca kendi operasyonel şubelerini tanımlayabilir; şube bağımsız lisanslı bayi olarak satılamaz.
2.2. Platinyum veya üst paketler toplu alt bayi ağı kurmak için kullanılamaz.
2.3. Aynı VKN ile çoklu aktif işletme lisansı açılamaz.
2.4. Personel hesapları üçüncü işletme personeline devredilemez.

3. BAYİ YÜKÜMLÜLÜKLERİ
3.1. Bayi, kayıt ettiği işletmenin gerçek son kullanıcı olduğunu, VKN ve unvan doğruluğunu teyit eder.
3.2. Sahte, ara veya yanıltıcı kayıt yasaktır; tespit halinde bayi hakedişleri dondurulur.

4. DENETİM VE TEKNİK ÖNLEMLER
4.1. Hizmet Sağlayıcı; VKN tekrarı, şube sayısı, IP/konum, kullanıcı davranışı ve ödeme paternleri üzerinden risk skoru uygular.
4.2. Şüpheli hesaplarda erişim askıya alınabilir; inceleme süresince veri aktarımı kısıtlanabilir.

5. CEZAİ ŞART (TBK m.179-182)
5.1. Madde 2 ve 3'teki yükümlülüklerin ihlali halinde Müşteri/Bayi, ihlal tarihinden geriye doğru 24 (yirmi dört) ay içinde Hizmet Sağlayıcı'ya ödenmiş tüm abonelik ve ek paket bedellerinin ${P.penaltyMultiplier} (beş) katını cezai şart olarak ödemeyi peşinen kabul eder.
5.2. Hesaplanan cezai şart tutarı ${P.penaltyMinimumTry.toLocaleString('tr-TR')} TL'nin altında kalamaz (asgari cezai şart).
5.3. Cezai şart; Hizmet Sağlayıcı'nın doğrudan zararlarının ve yoksun kalınan kazancın ayrıca talep edilmesine engel değildir.
5.4. Haksız kullanım tespitinde hesap derhal askıya alınır; tekrarda kalıcı fesih ve hukuki takip.

6. TAZMİNAT VE DELİL
6.1. Log kayıtları, elektronik onay kayıtları ve ödeme belgeleri kesin delil niteliğindedir.
6.2. İhlal bildirimi e-posta veya panel üzerinden yapılır; 7 gün içinde yazılı itiraz hakkı saklıdır.

7. UYUŞMAZLIK
${P.jurisdictionCourts} yetkilidir.

8. KABUL
İşaret kutusu ile onay, ıslak imza ve mühür hükmündedir; cezai şartın bağlayıcılığını Müşteri/Bayi açıkça kabul eder.`,
  },
  {
    id: 'DEALER_MANDATE',
    title: 'Bayi İşletme Kayıt, Tahsilat ve Temsil Yetkisi',
    shortLabel: 'Bayi Kayıt ve Tahsilat Yetkisi',
    requiredFor: ['dealer_business'],
    content: `BAYİ İŞLETME KAYIT, TAHSİLAT VE TEMSİL YETKİSİ
Sürüm: ${V}

Hizmet Sağlayıcı: ${P.legalName}, ${P.address}

1. YETKİ KAPSAMI
Bayi; kendi portföyündeki işletmeler adına paket seçimi, kayıt başlatma ve Sanal POS ile ödeme tahsilatı başlatma yetkisine sahiptir.

2. DOĞRULUK YÜKÜMLÜLÜĞÜ
Bayi; işletme unvanı, VKN, vergi dairesi, iletişim ve yetkili bilgilerinin doğru ve güncel olduğunu beyan eder. Hatalı bilgiden doğan tüm idari ve mali yükümlülükler bayiye aittir.

3. ÖDEME VE AKTİVASYON
3.1. Ödeme onayı gelmeden işletme hesabı aktif edilmez.
3.2. Ödeme sonrası seçilen paket modülleri otomatik tanımlanır; bayi manuel modül yükseltmesi yapamaz (SuperAdmin hariç).

4. SÖZLEŞME ONAYI
Bayi, işletme adına sözleşmelerin sunulduğunu ve işletmenin kendi kullanıcısı tarafından ayrıca onaylanacağını; bayinin sahte onay yapmayacağını taahhüt eder.

5. HAKEDİŞ
Komisyon ve hakediş, yalnızca başarılı ödeme ve aktif abonelik için hesaplanır; iptal/iade/chargeback hallerinde mahsup edilir.

6. UYUŞMAZLIK
${P.jurisdictionCourts} yetkilidir.`,
  },
  {
    id: 'DISTANCE_SALES',
    title: 'Mesafeli Hizmet Satışı ve Ön Bilgilendirme',
    shortLabel: 'Mesafeli Satış ve Ön Bilgilendirme',
    requiredFor: ['subscription_checkout'],
    content: `MESAFELİ HİZMET SATIŞI VE ÖN BİLGİLENDİRME FORMU
Sürüm: ${V}

Satıcı / Hizmet Sağlayıcı: ${P.legalName}
Adres: ${P.address}
E-posta: ${P.legalEmail}

1. HİZMETİN NİTELİĞİ
SmartNexus bulut ERP aboneliği — elektronik ortamda anında ifa edilen dijital hizmet.

2. BEDEL VE ÖDEME
Seçilen paket ve ek modül bedeli KDV dahil/hariç olarak ödeme ekranında gösterilir. Tahsilat Sanal POS ile yapılır.

3. İFA VE AKTİVASYON
Ödeme onayı sonrası abonelik otomatik aktive edilir; fiziki teslimat yoktur.

4. CAYMA HAKKI
6502 sayılı Kanun'un 15/ğ maddesi uyarınca elektronik ortamda anında ifa edilen dijital içerik/hizmetlerde, onay ile birlikte cayma hakkı kullanılamaz. Müşteri bu durumu peşinen kabul eder.

5. ŞİKAYET VE İADE
Teknik arıza ve hizmet kesintilerinde ${P.supportEmail}; ödeme itirazları için ${P.legalEmail}.

6. UYUŞMAZLIK
${P.jurisdictionCourts} yetkilidir.`,
  },
];

export function documentsForContext(ctx: 'dealer_business' | 'subscription_checkout') {
  return LEGAL_DOCUMENTS.filter((d) => d.requiredFor.includes(ctx));
}

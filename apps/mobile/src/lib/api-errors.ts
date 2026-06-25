import axios from 'axios';

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return 'Sunucu yanıt vermiyor. İnternet bağlantınızı kontrol edin ve 30 saniye sonra tekrar deneyin (canlı sunucu uykuya geçmiş olabilir).';
    }
    if (!err.response) {
      return 'Ağ hatası: sunucuya ulaşılamıyor. Wi‑Fi/mobil veri açık mı kontrol edin.';
    }
    const msg = err.response.data?.message;
    if (typeof msg === 'string' && msg.length > 0) {
      if (msg.includes('LOGIN_ERROR')) {
        return 'E-posta/telefon veya şifre hatalı. Canlı sunucuda farklı şifre gerekebilir.';
      }
      return msg;
    }
    if (err.response.status === 401) {
      return 'Giriş bilgileri hatalı.';
    }
    if (err.response.status >= 500) {
      return 'Sunucu hatası. Biraz bekleyip tekrar deneyin.';
    }
  }
  return 'İşlem başarısız. Lütfen tekrar deneyin.';
}
